const url = require("url");
const path = require("path");

const Discord = require("discord.js");

var express = require('express');
var app = express();

const passport = require("passport");
const session = require("express-session");
const LevelStore = require("level-session-store")(session);
const Strategy = require("passport-discord").Strategy;


const helmet = require("helmet");

const md = require("marked");
const db = require('quick.db');


module.exports = (client) => {
  
  const bilgiler = {
    oauthSecret: "4nLZcd25S102N33ZEpD2N3odTeS3SvlL",
    callbackURL: `https://mee6turk.glitch.me/callback`,
    domain: `https://mee6turk.glitch.me/`
  };
    
  const dataDir = path.resolve(`${process.cwd()}${path.sep}panel`);

  const templateDir = path.resolve(`${dataDir}${path.sep}html${path.sep}`);

  app.use("/css", express.static(path.resolve(`${dataDir}${path.sep}css`)));
  
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  passport.use(new Strategy({
    clientID: client.user.id,
    clientSecret: bilgiler.oauthSecret,
    callbackURL: bilgiler.callbackURL,
    scope: ["identify", "guilds" , "email"]
  },
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
  }));

  app.use(session({
    secret: 'xyzxyz',
    resave: false,
    saveUninitialized: false,
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(helmet());

  app.locals.domain = bilgiler.domain;
  
  app.engine("html", require("ejs").renderFile);
  app.set("view engine", "html");

  var bodyParser = require("body-parser");
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  })); 
  
  function girisGerekli(req, res, next) {
    if (req.isAuthenticated()) return next();
    req.session.backURL = req.url;
    res.redirect("/giris");
  }
  
  const yukle = (res, req, template, data = {}) => {
    const baseData = {
      bot: client,
      path: req.path,
      user: req.isAuthenticated() ? req.user : null
    };
    res.render(path.resolve(`${templateDir}${path.sep}${template}`), Object.assign(baseData, data));
  };
  
  let dil = ""
  
  app.get("/", (req, res) => {
    yukle(res, req, "anasayfa.ejs")
  });
   app.get("/", (req, res) => {
    yukle(res, req, "deneme.ejs")
  });
 

  app.get("/giris", (req, res, next) => {
    if (req.session.backURL) {
      req.session.backURL = req.session.backURL;
    } else if (req.headers.referer) {
      const parsed = url.parse(req.headers.referer);
      if (parsed.hostname === app.locals.domain) {
        req.session.backURL = parsed.path;
      }
    } else {
      req.session.backURL = "";
    }
    next();
    

  },
  passport.authenticate("discord"));

  app.get("/giris", (req, res, next) => {
    if (req.session.backURL) {
      req.session.backURL = req.session.backURL;
    } else if (req.headers.referer) {
      const parsed = url.parse(req.headers.referer);
      if (parsed.hostname === app.locals.domain) {
        req.session.backURL = parsed.path;
      }
    } else {
      req.session.backURL = "/en";
    }
    next();
  },
  passport.authenticate("discord"));
  
  app.get("/autherror", (req, res) => {
    res.json({"hata":"Bir hata sonucunda Discord'da ba??lanamad??m! L??tfen tekrar deneyiniz."})
  });
  
  app.get("/callback", passport.authenticate("discord", { failureRedirect: "/autherror" }), async (req, res) => {
    if (client.ayarlar.sahip.includes(req.user.id)) {
      req.session.isAdmin = true;
    } else {
      req.session.isAdmin = false;
    }
    if (req.session.backURL) {
      const url = req.session.backURL;
      req.session.backURL = null;
      res.redirect(url);

    } else {
      res.redirect(`anasayfa`);
    }
    

  });
  

  app.get("/cikis", function(req, res) {
    req.session.destroy(() => {
      req.logout();
      res.redirect("/anasayfa");
         
    });


  });
  
app.get("/moderation", (req, res) => {
    yukle(res, req, "moderation.ejs");
  });
  
  app.get("/leveling", (req, res) => {
    yukle(res, req, "leveling.ejs");
  });
  
   app.get("/premium", (req, res) => {
    yukle(res, req, "premium.ejs");
  });
app.get("/music", (req, res) => {
    yukle(res, req, "music.ejs");
  });
  app.get("/anasayfa", (req, res) => {
    yukle(res, req, "anasayfa.ejs");
  });
  
   app.get("/deneme", (req, res) => {
    yukle(res, req, "deneme.ejs");
  });
  app.get("/komutlar", (req, res) => {
    yukle(res, req, "komutlar.ejs");
  });
  
  app.get("/istatistikler", (req, res) => {
    var istatistik = {
      sunucu: client.guilds.size+" sunucu",
      kanal: client.channels.size+" kanal",
      kullan??c??: client.users.size+" kullan??c??"
    };
    yukle(res, req, "istatistikler.ejs", {istatistik});
  });
  
  app.get("/kullanicilar", (req, res) => {
    yukle(res, req, "kullan??c??lar.ejs");
  });
  
  app.get("/kullaniciler/:kullaniciID", (req, res) => {
    const kullanici = client.users.get(req.params.kullaniciID);
    if (!kullanici) return res.json({"hata":"Bot "+req.params.kullaniciID+" ID adresine sahip bir kullan??c??y?? g??remiyor."});
    yukle(res, req, "kullan??c??.ejs", {kullanici});
  });
  
  app.get("/kullaniciler/:kullaniciID/yonet", girisGerekli, (req, res) => {
    const kullanici = client.users.get(req.params.kullaniciID);
       const member = client.users.get(req.params.kullaniciID);

    if (!kullanici) return res.json({"hata":"Bot "+req.params.kullaniciID+" ID adresine sahip bir kullan??c??y?? g??remiyor."});
    if (req.user.id !== req.params.kullaniciID) return res.json({"hata":"Ba??kas??n??n kullan??c?? ayarlar??na dokunamazs??n."});
    yukle(res, req, "k-panel.ejs", {kullanici});
  });
  
  app.post("/kullaniciler/:kullaniciID/yonet", girisGerekli, (req, res) => {
    const kullanici = client.users.get(req.params.kullaniciID);
    if (!kullanici) return res.json({"hata":"Bot "+req.params.kullaniciID+" ID adresine sahip bir kullan??c??y?? g??remiyor."});
    if (req.user.id !== req.params.kullaniciID) return res.json({"hata":"Ba??kas??n??n kullan??c?? ayarlar??na dokunamazs??n."});
    client.panel.ayarlarKaydetKullanici(kullanici.id, kullanici, req.body, req, res);
    res.redirect(`/kullaniciler/${req.params.kullaniciID}/yonet`);
  });
  
  app.get("/kullaniciler/:kullaniciID/yonet/:ayarID/sifirla", girisGerekli, (req, res) => {
    if (db.has(`${req.params.kullaniciID}.${req.params.ayarID}`) ===  false || req.params.ayarID === "resim" && db.fetch(`${req.params.kullaniciID}.${req.params.ayarID}`) === "https://img.revabot.tk/99kd63vy.png") return res.json({"hata":req.params.ayarID.charAt(0).toUpperCase()+req.params.ayarID.slice(1)+" ayar?? "+client.users.get(req.params.kullaniciID).tag+" adl?? kullan??c??da ayarl?? olmad?????? i??in s??f??rlanamaz."});
    db.delete(`${req.params.kullaniciID}.${req.params.ayarID}`)
    res.redirect(`/kullaniciler/${req.params.kullaniciID}/yonet`);
  });
  
  app.get("/sunucular", (req, res) => {
    yukle(res, req, "sunucular.ejs"); //sunucu bilgi g??sterme sistemi xd
  });
  
  app.get("/sunucular/:sunucuID", (req, res) => {
    const sunucu = client.guilds.get(req.params.sunucuID);
    if (!sunucu) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    yukle(res, req, "sunucu.ejs", {sunucu});
  });
  
  app.get("/sunucular/:sunucuID/uyeler", (req, res) => {
    const sunucu = client.guilds.get(req.params.sunucuID);
    if (!sunucu) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    yukle(res, req, "??yeler.ejs", {sunucu});
  });
  
  app.get("/sunucular/:sunucuID/roller", (req, res) => {
    const sunucu = client.guilds.get(req.params.sunucuID);
    if (!sunucu) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    yukle(res, req, "roller.ejs", {sunucu});
  });
  
  app.get("/sunucular/:sunucuID/kanallar", (req, res) => {
    const sunucu = client.guilds.get(req.params.sunucuID);
    if (!sunucu) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    yukle(res, req, "kanallar.ejs", {sunucu});
  });
  
  app.get("/dashboard", girisGerekli, (req, res) => {
    const perms = Discord.Permissions;
    yukle(res, req, "dashboard.ejs", {perms});
  });
  
  app.get("/dashboard/:sunucuID", girisGerekli, (req, res) => {
    res.redirect(`/dashboard/${req.params.sunucuID}/manage`);
  });

  app.get("/dashboard/:sunucuID/manage", girisGerekli, (req, res) => {
    const sunucu = client.guilds.get(req.params.sunucuID);
    const guild = client.guilds.get(req.params.guildID);
    if (!sunucu) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = sunucu && !!sunucu.member(req.user.id) ? sunucu.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-ayarlar.ejs", {sunucu, guild});
  });
  

  
  
  // OTO TAG S??TEM?? 
  
  
  
        app.post("/dashboard/:guildID/ototag", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/ototag");
  });
  
  
  
      app.get("/dashboard/:guildID/ototag", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-ototag.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/tag/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`tagB_${req.params.sunucuID}`) === false) return res.json({"hata": "otomatik tag adl?? ayar "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`tagB_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/ototag`);
  });
  
   app.get("/dashboard/:sunucuID/ototagK/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`tagKanal_${req.params.sunucuID}`) === false) return res.json({"hata": "Tag kay??t kanal??   "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`tagKanal_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/ototag`);
  });
  
  
  
  
  
  // OTOROL
  
  
  
  
      app.post("/dashboard/:guildID/otorol", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/otorol");
  });
  
  
  
      app.get("/dashboard/:guildID/otorol", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
            const sunucu = client.guilds.get(req.params.guildID);

if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-otorol.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/otorol/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`otoR_${req.params.sunucuID}`) === false) return res.json({"hata": "Otorol adl?? ayar "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`otoR_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/otorol`);
  });
  
   app.get("/dashboard/:sunucuID/otoRK/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`otoRK_${req.params.sunucuID}`) === false) return res.json({"hata": "Otorol kanal??   "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`otoRK_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/otorol`);
  });
  
  // F??LTRE
  
  
  
  
  
    app.get("/dashboard/:guildID/filtre", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-filtre.ejs", {sunucu, guild});
  });
  
  

  
  
    app.post("/dashboard/:guildID/filtre", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
      
    if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
  
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/filtre");
  });
  
  
    app.get("/dashboard/:guildID/filtre/sil", girisGerekli, async (req, res) => {
res.redirect("/dashboard/"+req.params.guildID+"/filtre");
});

  
  
 
app.get("/dashboard/:guildID/filtre/sil/:cmdID", girisGerekli, async (req, res) => {
const guild = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});


var komutf = req.params.cmdID;


if(!db.fetch(`filtre_${req.params.guildID}`).includes(komutf)) {
res.json({"hata":`Filtre bulunamad?? veya silinmi??.`});
} else {

let x = komutf
let arr = []
db.fetch(`filtre_${req.params.guildID}`).forEach(v => {
if (v !== x) {
arr.push(v)
}
})
  

db.set(`filtre_${req.params.guildID}`, arr)
  
}

res.redirect("/dashboard/"+req.params.guildID+"/filtre");
});

  
  // ??ZEL KOMUT
  
  
  
  app.get("/dashboard/:guildID/ozelkomutlar", girisGerekli, (req, res) => {
  const guild = client.guilds.get(req.params.guildID);
        const sunucu = client.guilds.get(req.params.guildID);

 if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
  const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
  yukle(res, req, "sayfa-ozelkomutlar.ejs", {guild, sunucu});
});

  app.post("/dashboard/:guildID/ozelkomutlar", girisGerekli, (req, res) => {
  const guild = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
  const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});

  client.customCmds(guild.id, req.body);
  res.redirect("/dashboard/"+req.params.guildID+"/ozelkomutlar");
});
  
  
  
  app.get("/dashboard/:guildID/ozelkomutlar", girisGerekli, (req, res) => {
const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
yukle(res, req, "sayfa-ozelkomutlar.ejs", {guild, sunucu});
});

app.post("/dashboard/:guildID/ozelkomutlar", girisGerekli, (req, res) => {
const guild = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});

  
  
client.customCmds(guild.id, req.body);
res.redirect("/dashboard/"+req.params.guildID+"/ozelkomutlar");
});
  
  
  app.get("/dashboard/:guildID/ozelkomutlar/sil", girisGerekli, async (req, res) => {
res.redirect("/dashboard/"+req.params.guildID+"/ozelkomutlar");
});

  
  
  const fs = require('fs');
app.get("/dashboard/:guildID/ozelkomutlar/sil/:cmdID", girisGerekli, async (req, res) => {
const guild = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});


var komut = req.params.cmdID;

let komutlar = client.cmdd
if(komutlar[req.params.guildID].length === 1) {
 if(Object.keys(komutlar[req.params.guildID][0])[0].toString() === komut) {
   delete komutlar[req.params.guildID]
   fs.writeFile("./komutlar.json", JSON.stringify(komutlar), (err) => {
     console.log(err)
   })
 }
} else {
for (var i = 0; i < komutlar[req.params.guildID].length; i++) {
 if(Object.keys(komutlar[req.params.guildID][i])[0].toString() === komut) {
   komutlar[req.params.guildID].splice(i, 1);

   fs.writeFile("./komutlar.json", JSON.stringify(komutlar), (err) => {
     console.log(err)
   })
 }
}
}

res.redirect("/dashboard/"+req.params.guildID+"/ozelkomutlar");
});

  
  //DAVET S??STEM??
  
  
        app.post("/dashboard/:guildID/davetsistemi", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/davetsistemi");
  });
  
  
  
      app.get("/dashboard/:guildID/davetsistemi", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-davet.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/dkanal/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`dKanal_${req.params.sunucuID}`) === false) return res.json({"hata": "Davet kanal?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`dKanal_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/davetsistemi`);
  });
  
  //G??R???? ??IKI??
  
  
  

  
        app.post("/dashboard/:guildID/giriscikis", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/giriscikis");
  });
  
  
  
      app.get("/padashboardnel/:guildID/giriscikis", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-giri??????k????.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/cikism/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`cikisM_${req.params.sunucuID}`) === false) return res.json({"hata": "????k???? mesaj?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`cikisM_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/giriscikis`);
  });
    app.get("/dashboard/:sunucuID/girisk/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`gc_${req.params.sunucuID}`) === false) return res.json({"hata": "Giri?? ????k???? kanal?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`gc_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/giriscikis`);
  });
  
   app.get("/dashboard/:sunucuID/girism/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`girisM_${req.params.sunucuID}`) === false) return res.json({"hata": "Giri?? mesaj?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`girisM_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/giriscikis`);
  });
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  
  // DESTEK S??TEM
  
      app.post("/dashboard/:guildID/desteksistemi", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/desteksistemi");
  });
  
  
  
      app.get("/dashboard/:guildID/desteksistemi", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-destek.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/destekk/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`destekK_${req.params.sunucuID}`) === false) return res.json({"hata": "Destek kanal?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`destekK_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/desteksistemi`);
  });
  
   app.get("/dashboard/:sunucuID/destekr/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`destekR_${req.params.sunucuID}`) === false) return res.json({"hata": "Destek Rol?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`destekR_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/desteksistemi`);
  });
  
  
  
// SAYA?? S??STEM??
          app.post("/dashboard/:guildID/sayac", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/sayac");
  });
  
  
  
      app.get("/dashboard/:guildID/sayac", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-saya??.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/skanal/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`sKanal_${req.params.sunucuID}`) === false) return res.json({"hata": "????k???? mesaj?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`sKanal_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/sayac`);
  });
    app.get("/dashboard/:sunucuID/sayac/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`sayac_${req.params.sunucuID}`) === false) return res.json({"hata": "Giri?? ????k???? kanal?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`sayac_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/sayac`);
  });


// GENEL AYARLAR
 

         app.post("/dashboard/:guildID/genel", girisGerekli, async(req, res) => {
    const guild = client.guilds.get(req.params.guildID);
      const sunucu = client.guilds.get(req.params.sunucuID);
   if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
   
    client.writeSettings(guild.id, req.body);
       
 
    res.redirect("/dashboard/"+req.params.guildID+"/genel");
  });
  
  
  
      app.get("/dashboard/:guildID/genel", girisGerekli, (req, res) => {
    const guild = client.guilds.get(req.params.guildID);
    const sunucu = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    yukle(res, req, "sayfa-genel.ejs", {guild, sunucu});
  });
  
  
  
  app.get("/dashboard/:sunucuID/srol/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`sRol_${req.params.sunucuID}`) === false) return res.json({"hata": "Susturma rol?? "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`sRol_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/genel`);
  });
  
   app.get("/dashboard/:sunucuID/prefix/sifirla", girisGerekli, (req, res) => {
    if (client.ayar.has(`prefix_${req.params.sunucuID}`) === false) return res.json({"hata": "Prefix   "+client.guilds.get(req.params.sunucuID).name+" adl?? sunucuda ayarl?? olmad?????? i??in s??f??rlanamaz."});
    client.ayar.delete(`prefix_${req.params.sunucuID}`)
    res.redirect(`/dashboard/${req.params.sunucuID}/genel`);
  });
  
  
  
  
    app.get("/dashboard/:guildID/komut-yasak/sil", girisGerekli, async (req, res) => {
res.redirect("/dashboard/"+req.params.guildID+"/genel");
});

  
  
 
app.get("/dashboard/:guildID/komut-yasak/sil/:cmdID", girisGerekli, async (req, res) => {
const guild = client.guilds.get(req.params.guildID);
if (!guild) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
  if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});


var komutf = req.params.cmdID;


if(!db.fetch(`yasakK_${req.params.guildID}`).includes(komutf)) {
res.json({"hata":`Yasaklanan komut bulunamad?? veya silinmi??.`});
} else {

let x = komutf
let arr = []
db.fetch(`yasakK_${req.params.guildID}`).forEach(v => {
if (v !== x) {
arr.push(v)
}
})
  

db.set(`yasakK_${req.params.guildID}`, arr)
  
}

res.redirect("/dashboard/"+req.params.guildID+"/genel");
});


  
  
  

  
  
  app.post("/dashboard/:sunucuID/manage", girisGerekli, (req, res) => {
    const sunucu = client.guilds.get(req.params.sunucuID);
    const g = client.guilds.get(req.params.sunucuID);
    if (!sunucu) return res.json({"hata":"Bot "+req.params.sunucuID+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = sunucu && !!sunucu.member(req.user.id) ? sunucu.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Y??net iznin bulunmuyor. Bu y??zden bu sayfaya eri??im sa??layamazs??n."});
    
    if (req.body['komut'] && req.body['aciklama']) {
      if (client.kay??t.komutlar.has(req.body['komut']) === true || client.kay??t.alternatifler.has(req.body['komut'])) return res.json({"hata":"Botun zaten var olan bir komutu ??zel komut olarak eklenemez."});
      if (db.has(`${sunucu.id}.??zelKomutlar`) === true) {
        for (var i = 0; i < db.fetch(`${sunucu.id}.??zelKomutlar`).length; i++) {
          if (Object.keys(db.fetch(`${sunucu.id}.??zelKomutlar`)[i])[0] === req.body['komut']) return res.json({"hata":"Sunucuda "+req.body['komut']+" adl?? bir ??zel komut zaten bulundu??u i??in tekrar eklenemez."});
        }  
      }
    }
    

  
    if (req.body['ban']) {
      if (sunucu.members.get(client.user.id).permissions.has("BAN_MEMBERS") === false) return res.json({"hata":"Botun "+sunucu.name+" adl?? sunucuda ??yeleri Yasakla (BAN_MEMBERS) izni olmad?????? i??in "+client.users.get(req.body['ban']).tag+" adl?? ??ye yasaklanam??yor."});
    }
    if (req.body['unban']) {
      require('request')({
        url: `https://discordapp.com/api/v7/users/${req.body['unban']}`,
        headers: {
          "Authorization": `Bot ${client.token}`
        }
      }, async function(error, response, body) {
        if (JSON.parse(body).message && JSON.parse(body).message === "Invalid Form Body") return res.json({"hata":"Discord'da "+req.body['unban']+" ID adresine sahip bir kullan??c?? bulunmuyor."});
        let bans = await sunucu.fetchBans();
        if (bans.has(req.body['unban']) === false) return res.json({"hata":sunucu.name+" sunucusunda "+JSON.parse(body).username+"#"+JSON.parse(body).discriminator+" adl?? kullan??c?? yasakl?? olmad?????? i??in yasa????n?? kald??ramam."});
        res.redirect(`/dashboard/${req.params.sunucuID}/yonet`);
      });
      return
    }
    if (req.body['kick']) {
      if (sunucu.members.get(client.user.id).permissions.has("KICK_MEMBERS") === false) return res.json({"hata":"Botun "+sunucu.name+" adl?? sunucuda ??yeleri At (KICK_MEMBERS) izni olmad?????? i??in "+client.users.get(req.body['kick']).tag+" adl?? ??ye at??lam??yor."}); 
    }
    
    client.panel.ayarlarKaydet(sunucu.id, sunucu, req.body, req, res);
    res.redirect(`/dashboard/${req.params.sunucuID}/yonet`);
  });
  


  
  app.get("/admin", girisGerekli, (req, res) => {
    yukle(res, req, "admin.ejs");
  });
  
  app.get("/addbot", (req, res) => {
    res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`);
  });
  
  app.get("/sunucular/:sunucuID/botuat", girisGerekli, (req, res) => {
    client.guilds.get(req.params.sunucuID).leave();
    res.redirect("/sunucular");
  });
  
 
  //??ngilizce B??l??mler
  
  app.listen(process.env.PORT);
};