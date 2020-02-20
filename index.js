const express = require("express");
const hb = require("express-handlebars");
const app = express();
const csurf = require("csurf");
let sessionSecret;

if (process.env.NODE_ENV === "production") {
    sessionSecret = process.env;
} else {
    sessionSecret = require("./secrets");
}

const cookieSession = require("cookie-session");
const {
    addInfo,
    getInfo,
    getCount,
    getSig,
    registerUser,
    verify,
    addProfile,
    getFullName,
    getCity,
    getProfileInfo,
    updateUser,
    updateProfiles,
    updateNoPass,
    deleteSig,
    deleteUser
} = require("./db.js");
const bcrypt = require("./bcrypt");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(
    express.urlencoded({
        extended: false
    })
);

app.use(express.static(__dirname + "/public"));

app.use(
    cookieSession({
        secret: sessionSecret.SESSION_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());
app.use(function(req, res, next) {
    res.set("x-frame-options", "DENY");
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if (req.session.sigId && (req.url === "/" || req.url === "/petition")) {
        res.redirect("/thanks");
    } else {
        next();
    }
});

const requireLoggedOutUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

const requireSig = (req, res, next) => {
    if (!req.session.signatureId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

const requireNoSig = (req, res, next) => {
    if (req.session.signatureId) {
        res.redirect("/thanks");
    } else {
        next();
    }
};
let lowCaseCity = function(city) {
    return city.toLowerCase();
};

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("register", {
        layout: "main"
    });
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    bcrypt
        .hash(req.body.password)
        .then(hash => {
            return registerUser(
                req.body.first,
                req.body.last,
                req.body.email,
                hash
            );
        })
        .then(data => {
            req.session = {
                userId: data.rows[0].id,
                first: req.body.first,
                last: req.body.last
            };
            res.redirect("/profile");
        })
        .catch(err => {
            console.log(err);
            res.render("register", {
                layout: "main",
                err: err
            });
        });
});

app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login", {
        layout: "main"
    });
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    verify(req.body.email)
        .then(data => {
            if (data.rows[0].signatureId) {
                req.session = {
                    userId: data.rows[0].id,
                    first: data.rows[0].first,
                    last: data.rows[0].last,
                    signatureId: data.rows[0].signatureId
                };
            } else {
                req.session = {
                    userId: data.rows[0].id,
                    first: data.rows[0].first,
                    last: data.rows[0].last
                };
            }
            return bcrypt.compare(req.body.password, data.rows[0].password);
        })
        .then(bool => {
            if (bool == true) {
                res.redirect("/petition");
            } else {
                req.session = null;
                throw Error;
            }
        })
        .catch(err => {
            console.log(err);
            res.render("login", {
                layout: "main",
                err: err
            });
        });
});

app.get("/profile", (req, res) => {
    res.render("profile", {
        first: req.session.first,
        layout: "main"
    });
});

app.post("/profile", (req, res) => {
    let loweredCaseCity = lowCaseCity(req.body.city);

    addProfile(
        req.body.age,
        loweredCaseCity,
        req.body.homepage,
        req.session.userId
    )
        .then(() => {
            res.redirect("/petition");
        })
        .catch(err => console.log(err));
});

app.get("/profile/edit", (req, res) => {
    getProfileInfo(req.session.userId)
        .then(data => {
            if (data.rows[0]) {
                res.render("editprofile", {
                    layout: "main",
                    first: data.rows[0].first,
                    last: data.rows[0].last,
                    email: data.rows[0].email,
                    age: data.rows[0].age,
                    city: data.rows[0].city,
                    url: data.rows[0].url
                });
            } else {
                res.redirect("/profile");
            }
        })
        .catch(err => console.log(err));
});

app.post("/profile/edit", (req, res) => {
    if (req.body.password != "") {
        bcrypt.hash(req.body.password).then(hash => {
            Promise.all([
                updateUser(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash,
                    req.session.userId
                ),
                updateProfiles(
                    req.body.age,
                    req.body.city,
                    req.body.url,
                    req.session.userId
                )
            ])
                .then(() => res.redirect("/signers"))
                .catch(err => console.log(err));
        });
    } else {
        Promise.all([
            updateNoPass(
                req.body.first,
                req.body.last,
                req.body.email,
                req.session.userId
            ),
            updateProfiles(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
        ])
            .then(() => res.redirect("/signers"))
            .catch(err => console.log(err));
    }
});

app.post("/delete-sig", (req, res) => {
    deleteSig(req.session.userId)
        .then(() => {
            req.session.signatureId = null;
            res.redirect("/petition");
        })
        .catch(err => console.log(err));
});

app.get("/petition", requireNoSig, (req, res) => {
    getFullName(req.session.userId).then(data => {
        let first = data[0].first;
        let last = data[0].last;
        res.render("petition", {
            layout: "main",
            first,
            last
        });
    });
});

app.post("/petition", (req, res) => {
    addInfo(req.session.userId, req.body.signature)
        .then(data => {
            console.log(data.rows[0]);
            req.session.signatureId = data.rows[0].id;
            res.redirect("/thanks");
        })
        .catch(err => {
            console.log("Error in post: ", err);
            res.render("petition", {
                err
            });
        });
    // }
});

app.get("/thanks", requireSig, async (req, res) => {
    let count;

    let sig = "";
    if (req.session.signatureId != undefined) {
        sig = await getSig(req.session.signatureId);
        sig = sig[0].sig;
    }
    getCount()
        .then(data => {
            count = data[0].count;
        })
        .then(() => {
            res.render("thanks", {
                layout: "main",
                count,
                sig
            });
        });
});

app.get("/signers", requireSig, (req, res) => {
    let signers = [];
    getInfo()
        .then(data => {
            data.forEach((item, index) => {
                console.log("ITEM", item);
                signers.push(item);
            });
        })
        .then(() => {
            res.render("signers", {
                layout: "main",
                signers
            });
        })
        .catch(err => console.log(err));
});

app.get("/signers/:city", (req, res) => {
    const city = req.params.city;
    getCity(city)
        .then(data => {
            res.render("city", {
                layout: "main",
                signers: data.rows,
                city: city
            });
        })
        .catch(err => console.log(err));
});
app.listen(process.env.PORT || 8080, () =>
    console.log("Server is running on port 8080")
);

app.post("/profile/delete", (req, res) => {
    deleteUser(req.session.userId)
        .then(() => {
            req.session = null;
            res.redirect("/logout");
        })
        .catch(err => console.log(err));
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/register");
});
