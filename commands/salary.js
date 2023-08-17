const yargs_root = require('yargs');
const path = require('path');
const os = require('os');
const fs = require('fs');
const _ = require('lodash');
const {zrequire} = require('../utils.js');
const etask = zrequire('../../util/etask.js');
const date = zrequire('../../util/date.js');
const wget = zrequire('../../util/wget.js');
const keyring = zrequire('../../util/keyring.js');
const cli = zrequire('../../util/cli.js');

const config_dir = path.join(os.homedir(), '_billing_info');
if (!fs.existsSync(config_dir))
{
    fs.mkdirSync(config_dir);
}

class File_keyring extends keyring.File_keyring {
    constructor(pass){
        super({});
        this.dir = config_dir;
        if (!pass)
        {
            keyring.init();
            let user = 'mongo:'+process.env.USER;
            pass = keyring.get(user);
            if (!pass)
            {
                throw new Error('use mongo_login for password')
            }
        }
        this.k = this.sha1(pass).slice(0, 32);
    }

    save_billing(data){
        this.set('billing', JSON.stringify(data));
    }

    get_billing(){
        let txt = this.get('billing');
        return JSON.parse(txt);
    }
}

const get_date = (_date, add = undefined)=>{
    _date = date(_date);
    if (add)
    {
        _date = date.add(_date, add);
    }
    return date.strftime('%d-%B-%Y', _date);
};

const run = {
    command: 'bill',
    describe: 'prepare monthly salary bill',
    builder: yargs=>yargs
        .option('per_hour', {
            describe: 'Dollars per hour',
            default: 1,
        })
        .option('per_month', {
            describe: 'Additional payment per month',
            default: 250,
        }),
    handler: ()=>etask(function* (){
        let fk = new File_keyring();
        let data = fk.get_billing();
        data.information.number++;
        let invoice_date = get_date(date.nth_of_month(date(), 26));
        Object.assign(data.information, {
            date: invoice_date,
            'due-date': get_date(invoice_date, {d: 3}),
        });

    }),
};
const readline = (question, validate_fn)=>etask(function* (){
    if (!question.endsWith(':'))
    {
        question += ':';
    }
    this.finally(()=>{
        console.log('-'.repeat(20));
    });
    while (true)
    {
        let value = yield cli.get_input(question);
        let {error, result} = validate_fn(value);
        if (error)
        {
            console.log(error);
        } else
        {
            return result;
        }
    }
});

const codes_upper_code =  {
    AED: 'د.إ',
    AFN: '؋',
    ALL: 'L',
    AMD: '֏',
    ANG: 'ƒ',
    AOA: 'Kz',
    ARS: '$',
    AUD: '$',
    AWG: 'ƒ',
    AZN: '₼',
    BAM: 'KM',
    BBD: '$',
    BDT: '৳',
    BGN: 'лв',
    BHD: '.د.ب',
    BIF: 'FBu',
    BMD: '$',
    BND: '$',
    BOB: '$b',
    BOV: 'BOV',
    BRL: 'R$',
    BSD: '$',
    BTC: '₿',
    BTN: 'Nu.',
    BWP: 'P',
    BYN: 'Br',
    BYR: 'Br',
    BZD: 'BZ$',
    CAD: '$',
    CDF: 'FC',
    CHE: 'CHE',
    CHF: 'CHF',
    CHW: 'CHW',
    CLF: 'CLF',
    CLP: '$',
    CNH: '¥',
    CNY: '¥',
    COP: '$',
    COU: 'COU',
    CRC: '₡',
    CUC: '$',
    CUP: '₱',
    CVE: '$',
    CZK: 'Kč',
    DJF: 'Fdj',
    DKK: 'kr',
    DOP: 'RD$',
    DZD: 'دج',
    EEK: 'kr',
    EGP: '£',
    ERN: 'Nfk',
    ETB: 'Br',
    ETH: 'Ξ',
    EUR: '€',
    FJD: '$',
    FKP: '£',
    GBP: '£',
    GEL: '₾',
    GGP: '£',
    GHC: '₵',
    GHS: 'GH₵',
    GIP: '£',
    GMD: 'D',
    GNF: 'FG',
    GTQ: 'Q',
    GYD: '$',
    HKD: '$',
    HNL: 'L',
    HRK: 'kn',
    HTG: 'G',
    HUF: 'Ft',
    IDR: 'Rp',
    ILS: '₪',
    IMP: '£',
    INR: '₹',
    IQD: 'ع.د',
    IRR: '﷼',
    ISK: 'kr',
    JEP: '£',
    JMD: 'J$',
    JOD: 'JD',
    JPY: '¥',
    KES: 'KSh',
    KGS: 'лв',
    KHR: '៛',
    KMF: 'CF',
    KPW: '₩',
    KRW: '₩',
    KWD: 'KD',
    KYD: '$',
    KZT: '₸',
    LAK: '₭',
    LBP: '£',
    LKR: '₨',
    LRD: '$',
    LSL: 'M',
    LTC: 'Ł',
    LTL: 'Lt',
    LVL: 'Ls',
    LYD: 'LD',
    MAD: 'MAD',
    MDL: 'lei',
    MGA: 'Ar',
    MKD: 'ден',
    MMK: 'K',
    MNT: '₮',
    MOP: 'MOP$',
    MRO: 'UM',
    MRU: 'UM',
    MUR: '₨',
    MVR: 'Rf',
    MWK: 'MK',
    MXN: '$',
    MXV: 'MXV',
    MYR: 'RM',
    MZN: 'MT',
    NAD: '$',
    NGN: '₦',
    NIO: 'C$',
    NOK: 'kr',
    NPR: '₨',
    NZD: '$',
    OMR: '﷼',
    PAB: 'B/.',
    PEN: 'S/.',
    PGK: 'K',
    PHP: '₱',
    PKR: '₨',
    PLN: 'zł',
    PYG: 'Gs',
    QAR: '﷼',
    RMB: '￥',
    RON: 'lei',
    RSD: 'Дин.',
    RUB: '₽',
    RWF: 'R₣',
    SAR: '﷼',
    SBD: '$',
    SCR: '₨',
    SDG: 'ج.س.',
    SEK: 'kr',
    SGD: 'S$',
    SHP: '£',
    SLL: 'Le',
    SOS: 'S',
    SRD: '$',
    SSP: '£',
    STD: 'Db',
    STN: 'Db',
    SVC: '$',
    SYP: '£',
    SZL: 'E',
    THB: '฿',
    TJS: 'SM',
    TMT: 'T',
    TND: 'د.ت',
    TOP: 'T$',
    TRL: '₤',
    TRY: '₺',
    TTD: 'TT$',
    TVD: '$',
    TWD: 'NT$',
    TZS: 'TSh',
    UAH: '₴',
    UGX: 'USh',
    USD: '$',
    UYI: 'UYI',
    UYU: '$U',
    UYW: 'UYW',
    UZS: 'лв',
    VEF: 'Bs',
    VES: 'Bs.S',
    VND: '₫',
    VUV: 'VT',
    WST: 'WS$',
    XAF: 'FCFA',
    XBT: 'Ƀ',
    XCD: '$',
    XOF: 'CFA',
    XPF: '₣',
    XSU: 'Sucre',
    XUA: 'XUA',
    YER: '﷼',
    ZAR: 'R',
    ZMW: 'ZK',
    ZWD: 'Z$',
    ZWL: '$'
};
const approval = question=>{
    if (!question.endsWith(' (y/n)'))
    {
        question += ' (y/n)';
    }
    return cli.ask_approval(question);
}
const install = {
    command: 'install',
    describe: 'Setup personal info for auto fill',
    handler: ()=>etask(function* (){
        let validate_pos_num = txt=>{
            txt = +txt;
            if (Number.isFinite(txt) && txt>0)
            {
                return {result: +txt};
            }
            return {error: 'Result must be a valid positive number'};
        };
        let nonull_str = txt=>{
            txt = txt?.trim();
            if (txt?.length>0)
            {
                return {result: txt};
            }
            return {error: 'Enter not empty string'};
        };
        let validate_date = txt=>{
            if (!date.is_date_like(txt))
            {
                return {error: 'Enter correct date'};
            }
            return {result: get_date(txt)};
        }
        let contract_start = yield readline('Enter you contract start date', validate_date)
        let data = {
            client: {
                company: "Bright Data Ltd.",
                address: "3 Hamachshev",
                zip: 4250714,
                city: "Netanya",
                country: "Israel",
                additional: 'VAT ID 514114842',
            },
            sender: {
                country: yield readline('Enter you country', nonull_str),
                city: yield readline('Enter you city', nonull_str),
                zip: yield readline('Enter you zip code', nonull_str),
                address: yield readline('Enter your address', nonull_str),
                bank_name: yield readline('Enter your full bank name. '+
                    'Example "BANGKOK BANK PUBLIC COMPANY LIMITED"', nonull_str),
                card_number: yield readline('Enter your card number', nonull_str),
                swift: yield readline('Enter you bank SWIFT. Example: '+
                    '"BKKBTHBK"', nonull_str),
            },
            settings: {
                currency: 'USD',
            },
            information: {},
            products: [{
                description: yield readline('Enter what kind of service'+
                    ' do you provide. Example: "Software engineering'+
                    ' service"', nonull_str)+' since %s'+
                ' to %s. according to Contractor Agreement as of ',
                price: yield readline('Enter you $/hour', validate_pos_num),
            }],
        };
        let first_invoice = date.nth_of_month(contract_start, 26);
        let last_invoice = date.nth_of_month(date.add(date(), {month: -1}), 26);
        data.information.number = Math.max(0, Math.ceil((last_invoice
            -first_invoice) / date.ms.MONTH));
        if (!approval('Your last invoice is: '
            +`${data.information.number}, is it correct?`))
        {
            data.information.number = yield readline('Enter you last invoice'+
                ' number', validate_pos_num);
        }
        data.products[0].description += contract_start;
        if (approval('Do you have additional monthly payment?'))
        {
            data.products.push({
                description: 'A monthly fee, %s according to Contractor '
                    +'Agreement as of '+contract_start,
                price: yield readline('Enter you $/month', validate_pos_num),
                quantity: 1,
            });
        }
        let fk = new File_keyring();
        fk.save_billing(data);
        console.log('DONE');
    }),
};
const today = {
    command: 'today',
    describe: `Print today's amount of earned money`,
    builder: yargs=>yargs
        .option('currency', {
            alias: 'c',
            array: true,
            type: 'string',
            default: ['eur', 'usd', 'ils', 'rub'],
            describe: 'Which currency we want to show',
        })
        .option('force', {
            alias: 'f',
            type: 'boolean',
            describe: 'Force updating currency exchange rate',
        }),
    handler: (argv)=>etask(function* (){
        keyring.init();
        let key_id = 'exchange.json';
        let exchange_raw = keyring.get(key_id);
        if (!exchange_raw || argv.force)
        {
            console.log('retreiving current exchange rate');
            let {body: {usd}} = yield wget('https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.json',
                {json: 1});
            exchange_raw = JSON.stringify(usd);
            keyring.set(key_id, exchange_raw);
        }
        let map = new Map(Object.entries(JSON.parse(exchange_raw)));
        map.set('usd', 1);
        let curs = argv.currency.map(x=>x.toLowerCase()).filter(x=>map.has(x));
        if (!curs?.length)
            return console.error('Select one from listed currencies:', curs);
        curs = _.sortBy(curs, x=>map.get(x));
        let username = process.env.USER;
        let {body} = yield wget('http://web.brightdata.com/att/daily/status?login='+username);
        let {hours: {total}} = JSON.parse(body);
        let hours = date.str_to_dur(total) / date.ms.HOUR;
        let fk = new File_keyring();
        let data = fk.get_billing();
        let salary_per_hour = data?.products?.[0]?.price;
        if (!Number.isFinite(salary_per_hour))
        {
            return console.error('run "salary install" to customize your'+
                ' monthly salary');
        }
        let dollars = salary_per_hour * hours;
        console.log(`Work for ${total} today, $${salary_per_hour}/hour`);
        for (let currency_key of curs)
        {
            let modifier = map.get(currency_key);
            let sign = codes_upper_code[currency_key.toUpperCase()] || currency_key;
            console.log(`[${sign}] ${(modifier * dollars).toLocaleString('ru-RU',{maximumFractionDigits: 2})}`);
        }
    }),
}

yargs_root
    .command(run)
    .command(install)
    .command(today)
    .completion('bash_completion', false)
    .help()
    .demandCommand()
    .recommendCommands()
    .wrap(yargs_root.terminalWidth())
    .argv;