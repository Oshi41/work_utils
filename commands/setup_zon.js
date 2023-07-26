const yargs_root = require("yargs");
const path = require("path");
const os = require('os');
const fs = require('fs');
const apply_patch = require('apply-patch');
const {zrequire, parse_cvs_status, exec_and_record: r_exec} = require("../utils");
const etask = zrequire('../../util/etask.js');
const exec = zrequire('../../util/exec.js');

const exec_and_record = (args, opt, file, descr)=>r_exec(()=>etask(function*(){
    if (opt.hdr)
    {
        let hdr = `[${opt.hdr}]`;
        opt.log = d=>console.log(hdr, d);
        delete opt.hdr;
    }
    let res = yield exec.sys(args, {
        env: process.env,
        stdall: 'pipe',
        encoding: 'utf8',
        ...opt,
    });
    if (res.retval) {
        throw new Error(res.stderr.toString());
    }
    return res;
}), file, descr);

/**
 * @param root {string}
 * @return {Map<string, string>}
 */
const create_patches = (root) => etask(function* () {
    if (!fs.existsSync(root))
        return new Map();
    let map = yield parse_cvs_status(root);
    let changes = Array.from(map?.entries() || []).filter(([, x]) => x.modified);
    console.log(`Found ${changes.length} changes, creating patches`);
    let result = new Map();
    yield etask.all_limit(10, changes, ([file,]) => etask(function* () {
        let res = yield exec.sys(['cvs', 'diff', path.basename(file)],
            {
                cwd: path.dirname(file),
                env: process.env,
                stdall: 'pipe',
                encoding: 'utf8',
                log: () => {
                },
            });
        if (!!res.stderr.toString())
            return console.log(res.stderr.toString());
        let diff = res.stdall.toString();
        if (!diff)
            return;
        result.set(file, diff);
    }));
    if (!result.size)
        return;
    return result;
});

const check_zlxc_proc = (cwd) => etask(function* () {
    let res = yield exec_and_record(['ps', '-aux'], {cwd, hdr: 'zlxc run status'},
        'ps', '-aux');
    let regex = new RegExp(`node.+zon${process.argv[2]}.+zlxc.+run`);
    let proc = res.stdall.toString().split('\n').filter(x => regex.test(x));
    if (proc.length) {
        let zlxc_run = proc[0].substring(proc[0].indexOf('run '));
        console.log('stopping zlxc...');
        yield exec_and_record(['zlxc', 'stop'], {cwd, hdr: 'zlxc stop'},
            'zlxc', 'stop');
        return zlxc_run;
    }
});

const run = {
    command: 'run',
    handler: (opt) => etask(function* () {
        this.on('uncaught', console.error.bind(console));
        this.finally(()=>console.log('DONE'));
        if (!process.argv[2]) {
            return console.log('pass number to create zon copy folder');
        }
        let base_path = os.homedir();
        let zone_dir = path.join(base_path, 'zon' + process.argv[2]);

        const patches_map = yield create_patches(zone_dir);
        const zlxc = yield check_zlxc_proc(zone_dir);

        if (fs.existsSync(zone_dir)) {
            yield exec_and_record(['rm', '-rf', zone_dir],
                {hdr: 'rm folder'}, '_rm_root', '-rf');
        }

        yield exec_and_record(['cp', '-a', path.join(base_path, '.zon'), zone_dir],
            {hdr: '.zon copy'}, '_root_copy', '-a');

        if (patches_map?.size)
        {
            console.log('Apply patch');
            for (let [file, patch] of patches_map) {
                let patch_name = path.join(path.dirname(file), path.basename(file)+'.patch');
                try {
                    fs.writeFileSync(patch_name, patch, 'utf8');
                    yield apply_patch(patch_name);
                } finally {
                    fs.existsSync(patch_name) && fs.unlinkSync(patch_name);
                }
            }
        }

        process.env.BUILD = 'app';
        yield exec_and_record(['jtools', 'jselbuild', '-c', 'app'],
            {cwd: zone_dir, hdr: 'choose build'}, '_sb', '-c');
        yield exec_and_record(['jmake', 'config', 'DIST=APP BUILD=APP CONFIG_SELENIUM=y CONFIG_SELENIUM_DCA_CP=y'],
            {cwd: zone_dir, hdr: 'customize build'}, 'jmake', 'config');
        yield exec_and_record(['cvsup'],
            {cwd: zone_dir, hdr: 'cvsup'}, 'cvsup', '');
        yield exec_and_record(['jmake', 'cm', 'release'],
            {cwd: zone_dir, hdr: 'build release'}, 'jmake', 'cm release');

        if (zlxc)
        {
            console.log('Running zlxc...');
            yield exec_and_record(['zlxc', ...zlxc.split(' ')],
                {cwd: zone_dir, log: d=>console.log(d)},'zlxc', zlxc);
        }
    }),
}

yargs_root.scriptName('setup_zon')
    .command(run)
    .completion('bash_completion', false)
    .help()
    .demandCommand()
    .recommendCommands()
    .strict()
    .wrap(yargs_root.terminalWidth())
    .argv;