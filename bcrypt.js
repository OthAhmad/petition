const bcrypt = require("bcryptjs");
let { genSalt, hash, compare } = bcrypt;
const { promisify } = require("util");

genSalt = promisify(genSalt);
hash = promisify(hash);
compare = promisify(compare);

module.exports.hash = password => {
    return genSalt().then(salt => {
        return hash(password, salt);
    });
};
module.exports.compare = compare;
// genSalt().then(<
//     salt => hash("monkey", hash)).then(
//     hashedPass => {
//         console.log(hashedPass)
//         return compare('monkey', hashedPass)
//     };
// ).then(
//     console.log
// );
