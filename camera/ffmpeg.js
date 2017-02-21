//ffmpeg idea from SO:
//http://stackoverflow.com/questions/33152533/bundling-precompiled-binary-into-electron-app
const exec = require( 'child_process' ).exec
//var appRootDir = require('app-root-dir').get() //get the path of the application bundle
//var ffmpegpath=appRootDir+'/node_modules/ffmpeg/ffmpeg';
//var vidname = appRootDir+'/out.mov';
//var ffmpegArgs = ' -y -thread_queue_size 50 -f avfoundation -framerate 30.00 -i "1" -thread_queue_size 50 -f avfoundation -framerate 30.00 -video_size 1280x720 -i "0":"0" -c:v libx264 -crf 30 -preset ultrafast -filter_complex "[0]scale=iw/8:ih/8 [pip]; [1][pip] overlay=main_w-overlay_w-10:main_h-overlay_h-10" -r 30.00 ' + appRootDir + '/out.m4v'

var startRec = function(ffmpegpath, ffmpegArgs) {
  console.log(ffmpegpath+ffmpegArgs)
  const ffmpeg = exec( ffmpegpath+ffmpegArgs);  //add whatever switches you need here
  ffmpeg.stdout.on( 'data', data => {
   console.log( `stdout: ${data}` );
  });
  ffmpeg.stderr.on( 'data', data => {
   console.log( `stderr: ${data}` );
  });
}

var stopRec = function(){
  exec('killall ffmpeg')
}


module.exports = {
  startRec: startRec,
  stopRec: stopRec,
}
