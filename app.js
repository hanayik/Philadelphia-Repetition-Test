const electron = require('electron')
const Menu = electron.Menu
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const url = require('url')
const dialog = electron.dialog //for OS specific dialog windows
const si = require('systeminformation')
const ff = require('./camera/ffmpeg')
const appRootDir = require('app-root-dir').get() //get the path of the application bundle
const ffmpeg = appRootDir+'/ffmpeg/ffmpeg'
const exec = require( 'child_process' ).exec
const system = require('system-control')();
const notifier = require('electron-notifications')
const os = require("os");
const autoUpdater = electron.autoUpdater
var platform = os.platform() + '_' + os.arch();
var version = app.getVersion();
var updateResponse
app.setName('PRT')
//icon credit: http://www.flaticon.com/authors/madebyoliver

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600, fullscreen: true})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
  console.log('https://philadelphia-repetition-test.herokuapp.com/'+'update/'+platform+'/'+version)
  autoUpdater.setFeedURL('https://philadelphia-repetition-test.herokuapp.com/'+'update/'+platform+'/'+version);
  autoUpdater.checkForUpdates()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  function checkForMaxBrightness() {
    system.display.getBrightness().then(function(brightness) {
      //console.log(brightness)
      if (brightness < 1) {
        // dialog.showMessageBox({ type: 'info', buttons: ['Adjust brightness for me', 'Cancel'], message: "Your screen seems a bit dim, would you like to set it to it's maximum setting? It's best to have it as bright as possible." }, function (buttonIndex) {
        //   if (buttonIndex == 0) {
        //     maxBrightness = 1
        //     system.display.setBrightness(maxBrightness).then(function() {});
        //   }
        // });
        // USE NOTIFICATIONS WHEN MY PR IS MERGED!
        //
        const notification = notifier.notify('', {
          message: "Your screen is dim.",
          buttons: ['Illuminate', 'Cancel'],
          duration: 20000,
          icon: path.join(__dirname, 'icon.png')
        })
        notification.on('buttonClicked', (text) => {
          console.log(text)
          if (text === 'Illuminate') {
            console.log('Illuminate clicked!')
            maxBrightness = 1
            system.display.setBrightness(maxBrightness).then(function() {});
          }
          notification.close()
        })
        notification.on('clicked', () => {
          notification.close()
        })
      }
    });
  }

  checkForMaxBrightness()

  function checkVolumeLevel() {
    system.audio.getSystemVolume().then(function(volumeLevel) {
      //console.log(volumeLevel)
      if (volumeLevel < 75) {
        // dialog.showMessageBox({ type: 'info', buttons: ['Adjust volume for me', 'Cancel'], message: "Your volume is set a little low, would you like to set it a little louder?" }, function (buttonIndex) {
        //   if (buttonIndex == 0) {
        //     newVolumeLevel = 75
        //     system.audio.setSystemVolume(newVolumeLevel).then(function() {});
        //   }
        // });
        const notification = notifier.notify('', {
          message: "Your volume is a little low.",
          buttons: ['Make louder!', 'Cancel'],
          duration: 20000,
          icon: path.join(__dirname, 'icon.png')
        })
        notification.on('buttonClicked', (text) => {
          console.log(text)
          if (text === 'Make louder!') {
            console.log('Make louder clicked!')
            newVolumeLevel = 75
            system.audio.setSystemVolume(newVolumeLevel).then(function() {});
          }
          notification.close()
        })
        notification.on('clicked', () => {
          notification.close()
        })
      }
      });
  }

  checkVolumeLevel()


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
  exec('killall ffmpeg')
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})


autoUpdater.on('error', function(err) {
  console.log(err)
})
autoUpdater.on('checking-for-update', function(){
  console.log('checking for update')
})
autoUpdater.on('update-available', function(){
  console.log('update available, downloading now')
  var dialogOptions = {
    type: "question",
    buttons: ["Cancel", "Install"],
    defaultId: 1,
    title: "Install Update",
    message: "Would you like to install the latest version now? If so, the app will download the new version and update itself. It will take a few minutes, depending on your network connection.",
    cancelId: 0
  }
  dialog.showMessageBox(mainWindow, dialogOptions , function (response) {
    updateResponse = response
    if (response == 1) {

    }
  })
})
autoUpdater.on('update-not-available', function(){
  console.log('update not available')
})
autoUpdater.on('update-downloaded', function(){
  if (updateResponse == 1) {
    autoUpdater.quitAndInstall()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
