#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const bash_path = path.join(os.homedir(), '.bashrc');

const main = ()=>{
    const map = new Map();
    for (let basename of fs.readdirSync('commands'))
    {
        let file = path.join(__dirname, basename);
        let alias = path.basename(file, path.extname(file));
        map.set('alias '+alias, `node ${file}`)
    }
    let lines = fs.readFileSync(bash_path, 'utf-8').split('\n');
    let keys = Array.from(map.keys());
    let upd = lines.filter(x=>keys.every(a=>!x.includes(a)));
    fs.writeFileSync(bash_path, upd.join('\n'), {encoding: 'utf8'});
};

if (!module.parent)
    main();