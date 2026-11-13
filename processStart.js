const { spawn, exec, execFileSync } = require('child_process');

const trackedPids = new Set();

module.exports.track = function (proc) {
  if (proc && proc.pid) {
    trackedPids.add(proc.pid);
    proc.once('exit', () => trackedPids.delete(proc.pid));
  }
};

process.on('exit', function () {
  for (const pid of trackedPids) {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } catch (err) {
      // The process may already have exited.
    }
  }
});

module.exports.start = function (cmd, args) {
  let proc = spawn(cmd, args, {
    detached: true,
    windowsHide: true,
    stdio: 'ignore'
  });

  module.exports.track(proc);
  proc.unref();
  console.log(`started ${cmd} PID: ${proc.pid}`);

  return proc
}

module.exports.stop = function (proc) {
  if (proc && proc.pid) {
    // Windows taskkill to ensure the detached process closes cleanly
    exec(`taskkill /PID ${proc.pid} /T /F`, (err) => {
      if (err) console.error(`Error stopping ${proc.pid}:`, err.message);
      else console.log(`stopped ${proc.pid} successfully.`);
    });
  }
}

