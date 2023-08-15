const {zrequire, parse_cvs_status, exec_and_record: r_exec, tables} = require("./utils.js");
const etask = zrequire('../../util/etask.js');
const exec = zrequire('../../util/exec.js');
const {shellHistory, shellHistoryPath} = require('shell-history')

const main = ()=>etask(function*(){
    let hist = shellHistory();
    console.log(hist);
    // let res = yield exec.sys(['history'], {
    //     stdall: 1,
    // });
    // let lines = res.stdall.split('\n');
    // console.log(lines);
});
main();