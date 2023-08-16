const {zrequire, parse_cvs_status, exec_and_record: r_exec, tables} = require("./utils.js");
const etask = zrequire('../../util/etask.js');
const exec = zrequire('../../util/exec.js');
const keyring = zrequire('../../util/keyring.js');

const main = ()=>etask(function*(){
    keyring.init();
        let user = 'mongo:'+process.env.USER;
    let pass = keyring.get(user);
    console.log(pass);
});
main();