// If we are in the browser, just use performance.now
if (typeof document !== "undefined") {
    module.exports.now = function now() {
        return performance.now();
    };
    return;
}

const binding = require("./build/Release/binding.node");
const rdtsc = binding.rdtsc;

// Massive overkill at estimating the cycles per millisecond, but... at least the code
//  should work in other environments?
const precisionCycles = 10;
const clocksPerMilliEstimate = 100 * 1000;
// Our precision depends on the baseTime precision, so this is how many times precision
//  we want of that.
const targetPrecision = 100;
// Limit the test time, as baseTime might have a very low precision (10ms was possible
//  in some browsers, as some times, due to security reasons), and we don't want to block
//  startup for multiple seconds!
const maxTestTime = 50;
// Test a few times, in case there is a context switch during a test
const testCount = 3;

//let time = Date.now();
const milliPerClock = getMilliPerClock();
//console.log(`Took ${Date.now() - time}ms to estimate cycles per millisecond.`);


function baseTime() {
    return performance.now();
}
function getMilliPerClock() {
    // Will get borked if there is a context switch, but... should still be pretty good at detecting
    //  reduced precision of baseTime (which is used as a security feature in browsers).
    let timerPrecision = 0.001;
    for(let i = 0; i < precisionCycles; i++) {
        let startTime = baseTime();
        let endTime = baseTime();
        while (startTime === endTime) {
            endTime = baseTime();
        }
        let precision = endTime - startTime;
        if (precision > timerPrecision) {
            timerPrecision = precision;
        }
    }

    let targetTime = targetPrecision * timerPrecision;
    if (targetTime > maxTestTime) {
        targetTime = maxTestTime;
    }
    const clockCycles = clocksPerMilliEstimate * targetTime;
    console.log({ clockCycles, targetTime, timerPrecision });
    let fastest = Number.MAX_SAFE_INTEGER;
    for(let i = 0; i < testCount; i++) {
        let time = Date.now();
        let clock = rdtsc();
        for (let i = 0; i < clockCycles; i++) {
            rdtsc();
        }
        clock = rdtsc() - clock;
        time = Date.now() - time;
        let timePer = time / clock;
        if (timePer < fastest) {
            fastest = timePer;
        }
    }
    return fastest;
}

// TIMING: ~20ns
function now() {
    return rdtsc() * milliPerClock;
}
module.exports.now = now;

main();
async function main() {
    let time = baseTime();
    for(let i = 0; i < 1000 * 1000; i++) {
        now();
    }
    //await new Promise(r => setTimeout(r, 1000));
    console.log(baseTime() - time);
}
