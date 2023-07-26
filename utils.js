#!/usr/bin/env node
const nedb = require('nedb');
const _ = require('lodash4');
const path = require('path');
const fs = require('fs');
const zrequire = str => require(path.resolve('/usr/local/hola/system/scripts/', str));
zrequire('../../util/config.js');
const etask = zrequire('../../util/etask.js');
const E = exports;

E.db_folder = path.join(require("os").homedir(), '_database');
let db = {}, wait_et = etask.wait();

class exec_time {
    /**
     * @type {Date}
     */
    date;
    /**
     * @type {number}
     */
    time;
    /**
     * @type {string}
     */
    file;
    /**
     * @type {string}
     */
    params;
    /**
     * @type {boolean}
     */
    success;
    /**
     * @type {string | undefined}
     */
    error;

    constructor(obj) {
        if (obj) {
            Object.assign(this, obj);
        }
        this.success = !(!!this.error);
        this.date = this.date || new Date();
        this.error = this.error || ' ';
        clear_undef(this);
    }
}

class test_case {
    /**
     * @type {string}
     */
    file;
    /**
     * @type {string}
     */
    revision;
    /**
     * @type {description}
     */
    description;
    /**
     * @type {string}
     */
    name;

    constructor(obj) {
        if (obj)
            Object.assign(this, obj);
    }
}

class ignored_test {
    /**
     * @type {string}
     */
    file;
    /**
     * @type {Date}
     */
    date;
    /**
     * @type {string}
     */
    why;

    constructor(obj) {
        if (obj)
            Object.assign(this, obj);
    }
}

const find = (db_name, ...opt) => etask(function* () {
    wait_et && (yield this.wait_ext(wait_et));
    let _this = this;
    db[db_name].find(...[...opt, (err, docs) => {
        if (err)
            throw err;
        _this.return(docs);
    }]);
    yield this.wait();
})
const insert = (db_name, doc) => etask(function* () {
    wait_et && (yield this.wait_ext(wait_et));
    let _this = this;
    db[db_name].insert(doc, (err, upd_doc) => {
        if (err)
            throw err;
        _this.return(upd_doc);
    });
    yield this.wait();
});
const count = (db_name, opt) => etask(function* () {
    wait_et && (yield this.wait_ext(wait_et));
    let _this = this;
    db[db_name].count(opt, (err, count) => {
        if (err)
            throw err;
        _this.return(count);
    });
    yield this.wait();
});
const remove = (db_name, ...opt) => etask(function* () {
    wait_et && (yield this.wait_ext(wait_et));
    let _this = this;
    db[db_name].remove(...[...opt, (err, count) => {
        if (err)
            throw err;
        _this.return(count);
    }]);
    yield this.wait();
});

E.tables = {
    exec_time: {
        clazz: exec_time,
        /**
         * Average exec time for file with params
         * @param obj {exec_time}
         * @return {*}
         */
        avg: (obj) => etask(function* () {
            const docs = yield find('exec_time', obj, {time: 1});
            return _.meanBy(docs, 'time');
        }),
        /**
         * Inserts new doc
         * @param obj {exec_time}
         * @return {exec_time}
         */
        add: obj => insert('exec_time', obj),
    },
    test_case: {
        clazz: test_case,
        /**
         * @param obj {test_case}
         * @return {test_case}
         */
        add: obj => insert('test_case', obj),
        /**
         * @param obj {test_case}
         * @return {boolean}
         */
        exists: obj => etask(function* () {
            const _count = yield count('test_case', obj)
            return _count > 0;
        }),
        /**
         * Replace old file test cases with new ones
         * @param arr {Array<test_case>}
         * @return {boolean}
         */
        replace: arr => etask(function* () {
            if (!arr?.length)
                return false;
            yield etask.all(_.uniq(arr.map(x => ({file: x.file})))
                .map(x => remove('test_case', x, {multi: true})));
            for (let c of arr)
                yield insert('test_case', c);
        }),
        /**
         * All describes for file
         * @param file {string}
         * @return {Array<string>}
         */
        all_describes: file => etask(function* () {
            let results = yield find('test_case', {file}, {description: 1});
            return _.uniq(results.map(x => x.description));
        }),
    },
    ignored_tests: {
        clazz: ignored_test,
        add: obj => insert('ignored_tests', obj),
        rm: obj => remove('ignored_tests', obj),
        search_ignored: arr => etask(function* () {
            arr = Array.isArray(arr) ? arr : [arr];
            let res = yield find('ignored_tests', {file: {$in: arr}});
            return res.map(x => x.file);
        }),
    }
}

etask(function* _main() {
    this.finally(() => {
        wait_et.continue();
        wait_et = undefined;
    });
    this.on('uncaught', e => console.error(e));
    if (!fs.existsSync(E.db_folder))
        fs.mkdirSync(E.db_folder);
    let ensure_index = (db, opt) => etask(function* () {
        let _this = this;
        db.ensureIndex(opt, err => {
            if (err)
                throw err;
            _this.continue();
        });
        yield this.wait();
    });
    let create_db = opt => etask(function* () {
        let _this = this;
        let db = new nedb(Object.assign(opt, {
            autoload: true, onload: err => {
                if (err)
                    throw err;
                _this.continue();
            }
        }));
        yield this.wait();
        return db;
    });
    db.exec_time = yield create_db({filename: path.join(E.db_folder, 'exec_time.jsonl')});
    db.test_case = yield create_db({filename: path.join(E.db_folder, 'test_case.jsonl')});
    db.ignored_tests = yield create_db({filename: path.join(E.db_folder, 'ignored.jsonl')});

    yield ensure_index(db.exec_time, {fieldName: 'error', sparse: true});
    yield ensure_index(db.exec_time, {fieldName: 'params', sparse: true});
    yield ensure_index(db.exec_time, {fieldName: 'time'});
    yield ensure_index(db.exec_time, {fieldName: 'date'});
    yield ensure_index(db.exec_time, {fieldName: 'file'});

    yield ensure_index(db.test_case, {fieldName: 'file'});
    yield ensure_index(db.test_case, {fieldName: 'revision'});
    yield ensure_index(db.test_case, {fieldName: 'description', sparse: true});
    yield ensure_index(db.test_case, {fieldName: 'name', sparse: true});

    yield ensure_index(db.ignored_tests, {fieldName: 'file', sparse: true});
});

/**
 *
 * @param fn {etask | {cmd: Array, opt: Object}} - etask func or args to exec.sys
 * @param file {string} - file name
 * @param params {string} - params/test describe
 * @param log {Function}- log function (console.log by default)
 * @param time - avg success time
 * @param should_throw {boolean}
 * @return {*} - async func return
 */
E.exec_and_record = (fn, file, params = '', {
    log = console.log, time, should_throw
} = {}) => etask(function* () {
    let start = new Date(), err;
    if (log) {
        time = time || (yield db.tables.exec_time.avg({file, params}));
        if (time) {
            log?.(`~ ` + E.fmt_num(time, 'time'));
        }
    }
    try {
        if (typeof fn === 'function') {
            const res = yield fn();
            return res;
        }
        if (fn.cmd) {
            let opt = Object.assign({
                env: process.env,
                stdall: 'pipe',
                encoding: 'utf8'
            }, fn.opt);
            const res = yield exec.sys(fn.cmd, opt);
            if (res.retval) {
                err = new Error(res.stderr.toString());
            }
            return res;
        }
    } catch (e) {
        err = e;
        if (should_throw) {
            throw err;
        }
    } finally {
        let run_time = new Date() - start;
        yield db.tables.exec_time.add({
            date: start, file, params: params,
            time: run_time, error: err
        });
        if (log) {
            const time = yield db.tables.exec_time.avg({file, params});
            if (time) {
                let diff = time - run_time;
                let txt = 'Took ' + E.fmt_num(run_time, 'time');
                if (diff) {
                    txt += ', ' + (diff > 0 ? green + '+' : yellow) + E.fmt_num(diff, 'time');
                }
                log?.(txt + reset);
            }
        }
    }
});

/**
 * Parse cvs status for files
 * @param root {string}
 * @return {Map<string, {version: string, modified: boolean, relative_path: string}>}
 */
E.parse_cvs_status = (root) => E.exec_and_record(() => etask(function* () {
    root = E.get_zon_root(root);
    const res = yield exec.sys(['cvs', '-Q', 'status'], {
        cwd: root,
        env: process.env,
        stdall: 'pipe',
        encoding: 'utf8',
    });
    let lines = res.stdout.split('\n'), result = new Map();
    let r_name = /^File: (\S+)\s+Status:/, r_ver = /(\d+(\.\d+)+)/;
    let r_rel_file = /\/zon\/(.*),/;
    for (let i = 0; i < lines.length; i++) {
        let name = r_name.exec(lines[i])?.[1];
        if (name) {
            let rel_path = r_rel_file.exec(lines[i + 3])?.[1];
            if (!rel_path) {
                continue;
            }
            let upd = obj => {
                let key = path.join(root, rel_path);
                let source = result.get(key) || {}
                result.set(key, Object.assign(source, obj));
            }
            if (lines[i].includes('Locally')) {
                upd({modified: true});
            }
            let work_rev = r_ver.exec(lines[i + 2])?.[1];
            if (work_rev) {
                upd({version: work_rev});
            }
        }
    }
    return result;
}), 'cvs', '-Q status root', {log: data=>console.log(`[CVS check]`, data)});

E.find_test_files = (root, {test_type, spinner}) => etask(function* () {
    root = E.get_zon_root(root);
    let files = yield parse_cvs_status(root);
    spinner?.('cvs checked');
    let changed = new Map(Array.from(files.entries()).filter(x => x[1].modified));
    console.log('\n', `Changed files: [${Array.from(changed.keys()).join(', ')}]`);
    let result = [];
    let dirs = _.uniq(Array.from(changed.keys()).map(x => path.dirname(x)));
    for (let dir of dirs) {
        for (let file of fs.readdirSync(dir).map(x => path.join(dir, x))) {
            if (E.get_test_type(file) == test_type)
                result.push(file);
        }
    }
    const ignored = yield db.tables.ignored_tests.search_ignored(result);
    result = result.filter(x => !ignored.includes(x));
    return result;
});