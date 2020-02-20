const spicedPg = require("spiced-pg");

const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

exports.addInfo = (user_id, sig) => {
    const q = `INSERT INTO sig (user_id, sig) VALUES ($1, $2) RETURNING id`;
    const params = [user_id || null, sig || null];
    return db.query(q, params);
};

exports.getInfo = function() {
    return db
        .query(
            `SELECT first, last, age, city, url
            FROM users
            JOIN sig
            ON users.id = sig.user_id
            JOIN user_profile
            ON users.id = user_profile.user_id`
        )
        .then(({ rows }) => rows);
};

exports.getCount = () => {
    return db.query(`SELECT COUNT(sig) FROM sig`).then(({ rows }) => rows);
};

exports.getSig = id => {
    return db
        .query(`SELECT sig FROM sig WHERE id = $1`, [id])
        .then(({ rows }) => rows);
};

exports.registerUser = (first, last, email, password) => {
    return db.query(
        `INSERT INTO users (first, last, email, password)
        VALUES ($1, $2, $3, $4) RETURNING id`,
        [first, last, email, password]
    );
};

exports.verify = email => {
    return db.query(
        `SELECT users.id, users.first, users.last, users.password, sig.id AS "sigId"
        FROM users
        LEFT JOIN sig
        ON users.id = sig.user_id
        WHERE users.email = $1`,
        [email]
    );
};

exports.getFullName = id => {
    return db
        .query(
            `
        SELECT users.first, users.last FROM users WHERE id = $1
        `,
            [id]
        )
        .then(({ rows }) => rows);
};

// exports.getProfile = () => {
//     return db.query(
//         `SELECT first, last, age, city, url
//         FROM users
//         LEFT JOIN user_profile
//         ON users.id = user_profile.user_id
//         JOIN sig
//         ON users.id = sig.user_id`
//     );
// };

exports.addProfile = (age, city, url, userId) => {
    if (age == "") {
        return db.query(
            `INSERT INTO user_profile (city, url, user_id)
            VALUES ($1, $2, $3)`,
            [city, url, userId]
        );
    } else {
        return db.query(
            `INSERT INTO user_profile (age, city, url, user_id)
            VALUES ($1, $2, $3, $4)`,
            [age, city, url, userId]
        );
    }
};

exports.getCity = function(userCity) {
    return db.query(
        `SELECT first, last, age, city, url
        FROM users
        LEFT JOIN user_profile
        ON users.id = user_profile.user_id
        JOIN sig
        ON users.id = sig.user_id
        WHERE LOWER(city) = LOWER($1)`,
        [userCity]
    );
};

exports.getProfileInfo = userId => {
    return db.query(
        `SELECT users.first, users.last, users.email, user_profile.age, user_profile.city, user_profile.url
        FROM users
        JOIN user_profile
        ON users.id = user_profile.user_id
        WHERE users.id = $1`,
        [userId]
    );
};

exports.updateUser = (first, last, email, password, userId) => {
    db.query(
        `UPDATE users
        SET first = $1,
            last = $2,
            email = $3,
            password = $4
        WHERE id = $5`,
        [first, last, email, password, userId]
    );
};

exports.updateProfiles = (age, city, url, userId) => {
    if (age == "") {
        return db
            .query(
                `INSERT INTO user_profile (city, url, user_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id)
            DO UPDATE SET city = $1, url = $2`,
                [city, url, userId]
            )
            .catch(err => console.log(err));
    } else {
        return db
            .query(
                `INSERT INTO user_profile (age, city, url, user_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id)
            DO UPDATE SET age = $1, city = $2, url = $3`,
                [age, city, url, userId]
            )
            .catch(err => console.log(err));
    }
};

exports.updateNoPass = (first, last, email, userId) => {
    db.query(
        `UPDATE users
        SET first = $1,
            last = $2,
            email = $3
        WHERE id = $4`,
        [first, last, email, userId]
    );
};

exports.deleteSig = userId => {
    return db.query(
        `DELETE FROM sig
        WHERE user_id = $1`,
        [userId]
    );
};

exports.deleteUser = userId => {
    return db.query(`DELETE FROM users WHERE id = $1`, [userId]);
};
