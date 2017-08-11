const { remote, shell } = require('electron')
const {Menu, MenuItem} = remote
const path = require('path')
const csvsync = require('csvsync')
const fs = require('fs')
const $ = require('jQuery')
const {app} = require('electron').remote;
const {dialog} = require('electron').remote
app.setName('PRT')
const appRootDir = require('app-root-dir').get() //get the path of the application bundle
const ffmpeg = appRootDir+'/ffmpeg/ffmpeg'
const exec = require( 'child_process' ).exec
const si = require('systeminformation');
const mkdirp = require('mkdirp');
var ipcRenderer = require('electron').ipcRenderer;
var moment = require('moment')
var content = document.getElementById("contentDiv")
var audioNum = document.getElementById("audioNumID")
var localMediaStream
var sys = {
  modelID: 'unknown',
  isMacBook: false // need to detect if macbook for ffmpeg recording framerate value
}
var instructions = ["<h1>You are going to hear some real English words. <br>" +
                    "Listen to the words and repeat exactly what you hear. </h1>"]
var beepSound = path.join(__dirname, 'assets', 'beep.wav')
var exp = new experiment('prt')
// construct a new ffmpeg recording object
var rec = new ff()
var timeoutTime = 30 // in seconds
exp.getRootPath()
exp.getMediaPath()
var stimfile = path.resolve(exp.mediapath, 'stim.csv')
console.log(stimfile)
var trials = readCSV(stimfile)
var maxTrials = trials.length
var trialTimeoutID
var t = Number(audioNum.value)-1
var tReal = t-1
lowLag.init({'force':'audioTag'}); // init audio functions
var userDataPath = path.join(app.getPath('userData'),'Data')
makeSureUserDataFolderIsThere()
var savePath


function checkForUpdateFromRender() {
  ipcRenderer.send('user-requests-update')
  //alert('checked for update')
}

ipcRenderer.on('showSpinner', function () {
  //<div class="loader">Loading...</div>
  spinnerDiv = document.createElement('div')
  spinnerDiv.className = 'loader'
  spinnerDiv.style.zIndex = "1000";
  content.appendChild(spinnerDiv)
  console.log("added spinner!")

})



function getSubjID() {
  var subjID = document.getElementById("subjID").value.trim()
  if (subjID === '') {
    subjID = '0'
  }
  return subjID
}

function getSessID() {
  var sessID = document.getElementById("sessID").value.trim()
  if (sessID === '') {
    sessID = '0'
  }
  return sessID
}

function makeSureUserDataFolderIsThere() {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath)
  }
}



//camera preview on
function startWebCamPreview() {
  clearScreen()
  var vidPrevEl = document.createElement("video")
  vidPrevEl.autoplay = true
  vidPrevEl.id = "webcampreview"
  content.appendChild(vidPrevEl)
  navigator.webkitGetUserMedia({video: true, audio: false},
    function(stream) {
      localMediaStream = stream
      vidPrevEl.src = URL.createObjectURL(stream)
    },
    function() {
      alert('Could not connect to webcam')
    }
  )
}


// camera preview off
function stopWebCamPreview () {
  if(typeof localMediaStream !== "undefined")
  {
    localMediaStream.getVideoTracks()[0].stop()
    clearScreen()
  }
}


// get date and time for appending to filenames
function getDateStamp() {
  ts = moment().format('MMMM Do YYYY, h:mm:ss a')
  ts = ts.replace(/ /g, '-') // replace spaces with dash
  ts = ts.replace(/,/g, '') // replace comma with nothing
  ts = ts.replace(/:/g, '-') // replace colon with dash
  console.log('recording date stamp: ', ts)
  return ts
}


// runs when called by systeminformation
function updateSys(ID) {
  sys.modelID = ID
  if (ID.includes("MacBook") == true) {
    sys.isMacBook = true
  }

  //console.log("updateSys has updated!")
  //console.log(ID.includes("MacBook"))
  //console.log(sys.isMacBook)
} // end updateSys

si.system(function(data) {
  console.log(data['model']);
  updateSys(data['model'])
})


// ffmpeg object constructor
function ff() {
  this.ffmpegPath = path.join(appRootDir,'ffmpeg','ffmpeg'),
  this.framerate = function () {

  },
  this.shouldOverwrite = '-y',         // do overwrite if file with same name exists
  this.threadQueSize = '50',           // preallocation
  this.cameraFormat = 'avfoundation',  // macOS only
  this.screenFormat = 'avfoundation',  // macOS only
  this.cameraDeviceID = '0',           // macOS only
  this.audioDeviceID = '0',            // macOS only
  this.screenDeviceID = '1',           // macOS only
  this.videoSize = '1280x720',         // output video dimensions
  this.videoCodec = 'libx264',         // encoding codec
  this.recQuality = '20',              //0-60 (0 = perfect quality but HUGE files)
  this.preset = 'ultrafast',
  this.videoExt = '.mp4',
  // filter is for picture in picture effect
  this.filter = '"[0]scale=iw/8:ih/8 [pip]; [1][pip] overlay=main_w-overlay_w-10:main_h-overlay_h-10"',
  this.isRecording = false,
  this.getSubjID = function() {
    var subjID = document.getElementById("subjID").value.trim()
    if (subjID === '') {
      console.log ('subject is blank')
      alert('Participant field is blank!')
      subjID = '0000'
    }
    return subjID
  },
  this.getSessID = function () {
    var sessID = document.getElementById("sessID").value.trim()
    if (sessID === '') {
      console.log ('session is blank')
      alert('Session field is blank!')
      sessID = '0000'
    }
    return sessID
  },
  this.datestamp = getDateStamp(),
  this.makeOutputFolder = function () {
    outpath = path.join(savePath, app.getName(), getSubjID(), getSessID())
    console.log(outpath)
    if (!fs.existsSync(outpath)) {
      mkdirp.sync(outpath)
    }
    return outpath
  }
  this.outputFilename = function() {
    return path.join(this.makeOutputFolder(), this.getSubjID()+'_'+this.getSessID()+'_'+app.getName()+'_'+getDateStamp()+this.videoExt)
  },
  this.getFramerate = function () {
    if (sys.isMacBook == true){
      var framerate = 30
    } else {
      var framerate = 29.97
    }
    return framerate
  },
  this.startRec = function() {
    cmd = [
      this.ffmpegPath +
      ' ' + this.shouldOverwrite +
      ' -thread_queue_size ' + this.threadQueSize +
      ' -f ' + this.screenFormat +
      ' -framerate ' + this.getFramerate().toString() +
      ' -i ' + '"' + this.screenDeviceID + '"' +
      ' -thread_queue_size ' + this.threadQueSize +
      ' -f ' + this.cameraFormat +
      ' -framerate ' + this.getFramerate().toString() +
      ' -video_size ' + this.videoSize +
      ' -i "' + this.cameraDeviceID + '":"' + this.audioDeviceID + '"' +
      ' -profile:v baseline' +
      ' -c:v ' + this.videoCodec +
      ' -crf ' + this.recQuality +
      ' -preset ultrafast' +
      ' -filter_complex ' + this.filter +
      ' -r ' + this.getFramerate().toString() +
      ' -movflags +faststart ' + '"' + this.outputFilename() + '"'
    ]
    console.log('ffmpeg cmd: ')
    console.log(cmd)
    this.isRecording = true
    exec(cmd,{maxBuffer: 2000 * 1024}, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`)
        alert('Recording stopped!')
        return
      }
      // console.log(`stdout: ${stdout}`);
       console.log(`stderr: ${stderr}`);
    })
  },
  this.stopRec = function () {
    exec('killall ffmpeg')
  }
}


// open data folder in finder
function openDataFolder() {
  dataFolder = savePath
  if (!fs.existsSync(dataFolder)) {
    mkdirp.sync(dataFolder)
  }
  shell.showItemInFolder(dataFolder)
}


// play audio file using lowLag API
function playAudio(fileToPlay) {
  lowLag.load(fileToPlay);
  lowLag.play(fileToPlay);
}


// get timestamp (milliseconds since file loaded)
function getTime() {
  return performance.now()
}


// read csv file. This is how experiments will be controlled, query files to show, etc.
function readCSV(filename){
  var csv = fs.readFileSync(filename)
  var stim = csvsync.parse(csv, {
    skipHeader: false,
    returnObject: true
  })
  //var stim = csvReader(filename)
  console.log(stim)
  return stim
  //stim = readCSV(myfile)
  //console.log(stim)
  //var myfile = __dirname+'/experiments/pnt/assets/txt/pntstim.csv'
}



// remove all child elements from a div, here the convention will be to
// remove the elements from "contentDiv" after a trial
function clearScreen() {
  while (content.hasChildNodes())
  content.removeChild(content.lastChild)
}

function clearAllTimeouts() {
  clearTimeout(trialTimeoutID)
}

// show text instructions on screen
function showInstructions(txt) {
  clearScreen()
  rec.startRec()
  var textDiv = document.createElement("div")
  textDiv.style.textAlign = 'center'
  var p = document.createElement("p")
  // var txtNode = document.createTextNode(txt)
  // p.appendChild(txtNode)
  p.innerHTML = txt
  textDiv.appendChild(p)
  var lineBreak = document.createElement("br")
  var btnDiv = document.createElement("div")
  var startBtn = document.createElement("button")
  var startBtnTxt = document.createTextNode("Start")
  startBtn.appendChild(startBtnTxt)
  startBtn.className = 'startBtn'
  startBtn.onclick = showNextTrial
  btnDiv.appendChild(startBtn)
  content.appendChild(textDiv)
  content.appendChild(lineBreak)
  content.appendChild(btnDiv)
  return getTime()
}


// show single image on screen
function showImage(imgPath) {
  clearScreen()
  var imageEl = document.createElement("img")
  imageEl.src = imgPath
  content.appendChild(imageEl)
  return getTime()
}


// load experiment module js file. All experiments are written in js, no separate html file
function loadJS (ID) {
  if (!document.getElementById(ID +'JS')) {
    expDir = path.join(__dirname, '/experiments/', ID, path.sep)
    scrElement = document.createElement("script")
    scrElement.type = "application/javascript"
    scrElement.src = expDir + ID + '.js'
    scrElement.id = ID + 'JS'
    document.body.appendChild(scrElement)
    console.log('loaded: ', scrElement.src)
    //might need to wait for scrElement.onload event -- test this
    //http://stackoverflow.com/a/38834971/3280952
  }
}


// unload js at the end of experiment run
function unloadJS (ID) {
  if (document.getElementById(ID +'JS')) {
    scrElement = document.getElementById(ID +'JS')
    document.body.removeChild(scrElement)
    console.log('removed: ', ID +'JS')
  }
}


// wait for time (in ms) and then run the supplied function.
// for now, the supplied function can only have one input variable.
// this WILL HANG the gui
function waitThenDoSync(ms, doneWaitingCallback, arg){
   var start = performance.now()
   var end = start;
   while(end < start + ms) {
     end = performance.now()
  }
  if (arg !== undefined) {
    doneWaitingCallback(arg)
  } else {
    doneWaitingCallback()
  }
}


// wait for time (in ms) and then run the supplied function.
// for now, the supplied function can only have one input variable. (this does not hang gui)
function waitThenDoAsync (ms, doneWaitingCallback, arg) {
  start = performance.now()
  setTimeout(function () {
    if (arg !== undefined) {
      doneWaitingCallback(arg)
    } else {
      doneWaitingCallback()
    }
    end = performance.now()
    console.log('Actual waitThenDo() time: ', end - start)
  }, ms)
}


 // keys object for storing keypress information
var keys = {
  key : '',
  time : 0,
  rt: 0,
  specialKeys: [' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Shift', 'Tab', 'BackSpace'],
  alphaNumericKeys: 'abcdefghijklmnopqrstuvwxyz1234567890'.split(''), // inspired by: http://stackoverflow.com/a/31755504/3280952
  whiteList: function () {
    return this.alphaNumericKeys.concat(this.specialKeys)
  },
  blackList: [],
  isAllowed: function () {
    idx = this.whiteList().indexOf(this.key)
    var val = false
    if (idx > 0) {
      val = true
    } else {
      val = false
    }
    return val
  }
}


// experiment object for storing session parameters, etc.
function experiment(name) {
  this.beginTime= 0,
  this.endTime= 0,
  this.duration= 0,
  this.name= name,
  this.rootpath= '',
  this.mediapath= '',
  this.getDuration = function () {
    return this.endTime - this.beginTime
  },
  this.setBeginTime = function() {
    this.beginTime = performance.now()
  },
  this.setEndTime = function () {
    this.endTime = performance.now()
  },
  this.getMediaPath = function () {
    this.mediapath = path.join(__dirname, '/assets/')
    return this.mediapath
  },
  this.getRootPath = function () {
    this.rootpath = path.join(__dirname,'/')
    return this.rootpath
  }
}



// update keys object when a keydown event is detected
function updateKeys() {
  // gets called from: document.addEventListener('keydown', updateKeys);
  keys.key = event.key
  keys.time = performance.now() // gives ms
  keys.rt = 0
  console.log("key: " + keys.key)
  if (keys.key === 'ArrowRight') {
    showNextTrial()
  }
  if (keys.key === 'ArrowLeft') {
    showPreviousTrial()
  }
  return keys.time
}


// store state of navigation pane
var nav = {
  hidden: false
}


// open navigation pane
function openNav() {
    document.getElementById("navPanel").style.width = "150px"
    document.getElementById("contentDiv").style.marginLeft = "150px"
    document.body.style.backgroundColor = "rgba(0,0,0,0.3)"
    if (document.getElementById("imageElement")) {
      document.getElementById("imageElement").style.opacity = "0.1";
    }
    document.getElementById("closeNavBtn").innerHTML = "&times;"
}


// close navigation pane
function closeNav() {
    document.getElementById("navPanel").style.width = "0px";
    document.getElementById("contentDiv").style.marginLeft= "0px";
    document.getElementById("contentDiv").style.width= "100%";
    document.body.style.backgroundColor = "white";
    //document.getElementById("menuBtn").innerHTML = "&#9776;"
    if (document.getElementById("imageElement")) {
      document.getElementById("imageElement").style.opacity = "1";
    }
}


// toggle navigation pane, detect if hidden or not
function toggleNav() {
  if (nav.hidden) {
    openNav()
    nav.hidden = false
  } else {
    closeNav()
    nav.hidden = true
  }
}


// check if key that was pressed was the escape key or q. Quits experiment immediately
function checkForEscape() {
  key = event.key
  if (key === "Escape" || key=== "q") {
    console.log("Escape was pressed")
    openNav()
    nav.hidden = false
    // unloadJS(exp.name)
    clearScreen()
    rec.stopRec()
    clearTimeout(trialTimeoutID)
  }
}

function getStarted() {
  var subjID = document.getElementById("subjID").value.trim()
  var sessID = document.getElementById("sessID").value.trim()
  if (subjID === '' || sessID === '') {
    console.log ('subject and/or session is blank')
    alert('Participant field or session field is blank!')
  } else {
    console.log ('subject is: ', subjID)
    console.log('session is: ', sessID)
    stopWebCamPreview()
    t = Number(audioNum.value.trim())-1
    tReal = t-1
    if (Number(audioNum.value.trim()) > maxTrials+1) {
      alert("Invalid audio file number " + audioNum.value.trim() )
    } else {
      closeNav()
      showInstructions(instructions)
    }
  }
}




function showNextTrial() {
  clearTimeout(trialTimeoutID)
  closeNav()
  clearScreen()
  t += 1
  tReal = t-1
  audioNum.value = t
  if (tReal >= maxTrials) {
    clearScreen()
    rec.stopRec()
    clearAllTimeouts()
    openNav()
    return false
  }
  // var img = document.createElement("img")
  // img.src = path.join(exp.mediapath, 'sound512px' + '.png')
  // content.appendChild(img)
  playAudio(path.join(exp.mediapath, 'audio', trials[tReal].AudioName.trim() + '.wav'))
  trialTimeoutID = setTimeout(showNextTrial, 1000 * timeoutTime)
  return getTime()
}


function showPreviousTrial() {
  clearTimeout(trialTimeoutID)
  closeNav()
  clearScreen()
  t -= 1
  tReal = t-1
  audioNum.value = t
  if (tReal < 0) {
    t=1
    tReal = t-1
  }
  // var img = document.createElement("img")
  // img.src = path.join(exp.mediapath, 'sound512px' + '.png')
  // content.appendChild(img)
  playAudio(path.join(exp.mediapath, 'audio', trials[tReal].AudioName.trim() + '.wav'))
  trialTimeoutID = setTimeout(showNextTrial, 1000 * timeoutTime)
  return getTime()
}




// event listeners that are active for the life of the application
document.addEventListener('keyup', checkForEscape)
document.addEventListener('keyup', updateKeys)
