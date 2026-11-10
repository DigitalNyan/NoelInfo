require("dotenv").config();

const express = require("express");
const session = require("express-session");
const crypto = require("crypto");

const app = express();

app.set("trust proxy", 1);

const {
  PORT,
  CHANNELNOEL_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SESSION_SECRET
} = process.env;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
  name: "channelnoel.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000
  }
}));


// home
app.get("/", (req, res) => {


	if (req.session.user) {
	  const user = req.session.user;

	  const username = user.username || "?";
	  const userId = user.id ?? "?";
	  const role = user.role || "?";

	  const avatar = user.avatar
		? new URL(
			"/" + user.avatar.replace(/^\/+/, ""),
			CHANNELNOEL_BASE_URL
		  ).toString()
		: null;

	  return res.send(`
		<!DOCTYPE html>
		<html lang="fr">
		<head>
		  <meta charset="UTF-8">
		  <meta name="viewport" content="width=device-width, initial-scale=1">
		  <title>NoelInfo</title>

		  <style>
			* { box-sizing: border-box; }

			body {
			  margin: 0;
			  font-family: Arial, sans-serif;
			  background: #0f172a;
			  color: white;
			  min-height: 100vh;
			  display: flex;
			  justify-content: center;
			  align-items: center;
			  padding: 20px;
			}

			.card {
			  background: #1e293b;
			  padding: 35px;
			  border-radius: 20px;
			  width: 100%;
			  max-width: 450px;
			  box-shadow: 0 15px 40px #0005;
			}

			h1 { text-align: center; }

			.profile {
			  text-align: center;
			  margin: 30px 0;
			}

			.avatar {
			  width: 110px;
			  height: 110px;
			  border-radius: 50%;
			  object-fit: cover;
			  border: 4px solid #5865f2;
			}

			.username {
			  font-size: 25px;
			  font-weight: bold;
			  margin-top: 15px;
			}

			.connected {
			  color: #22c55e;
			  margin-top: 10px;
			  font-size: 14px;
			}

			.info {
			  background: #0f172a;
			  padding: 15px;
			  border-radius: 10px;
			  margin-bottom: 12px;
			}

			.label {
			  color: #94a3b8;
			  font-size: 13px;
			  margin-bottom: 7px;
			}

			.value { font-size: 16px; }

			.role {
			  color: #fbbf24;
			  font-weight: bold;
			  text-transform: uppercase;
			}

			button {
			  width: 100%;
			  margin-top: 20px;
			  padding: 14px;
			  border: none;
			  border-radius: 9px;
			  background: #ef4444;
			  color: white;
			  font-weight: bold;
			  cursor: pointer;
			}
		  </style>
		</head>

		<body>
		  <div class="card">

			<h1>NoelInfo</h1>

			<div class="profile">
			  ${
				avatar
				  ? `<img class="avatar"
					   src="${escapeHtml(avatar)}"
					   alt="${escapeHtml(username)}">`
				  : `<div class="avatar">rien</div>`
			  }

			  <div class="username">
				${escapeHtml(username)}
			  </div>

			  <div class="connected">
				Connecté avec ChannelNoel
			  </div>
			</div>

			<div class="info">
			  <div class="label">Identifiant</div>
			  <div class="value">${escapeHtml(userId)}</div>
			</div>

			<div class="info">
			  <div class="label">Nom d'utilisateur</div>
			  <div class="value">${escapeHtml(username)}</div>
			</div>

			<div class="info">
			  <div class="label">Rôle du compte</div>
			  <div class="value role">${escapeHtml(role)}</div>
			</div>

			<form action="/logout" method="POST">
			  <button type="submit">Se déconnecter</button>
			</form>

		  </div>
		</body>
		</html>
	  `);
	}



  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>NoelInfo</title>
      <style>
        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #0f172a;
          color: white;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .card {
          background: #1e293b;
          padding: 45px 35px;
          border-radius: 18px;
          text-align: center;
          width: 90%;
          max-width: 420px;
          box-shadow: 0 15px 40px #0005;
        }

        h1 { margin-bottom: 12px; }

        p {
          color: #94a3b8;
          margin-bottom: 30px;
        }

        .login {
          display: inline-block;
          background: #5865f2;
          color: white;
          text-decoration: none;
          padding: 15px 25px;
          border-radius: 9px;
          font-weight: bold;
          transition: .2s;
        }

        .login:hover {
          background: #4752c4;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>NoelInfo</h1>
        <p>Connecte-toi pour accéder aux infos de ton compte.</p>

        <a class="login" href="/auth/channelnoel">
          Se connecter avec ChannelNoel
        </a>
      </div>
    </body>
    </html>
  `);
});

// challenge PKCE
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");

  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}

// escape HTML
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// OAuth
app.get("/auth/channelnoel", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  const { verifier, challenge } = generatePKCE();

  req.session.oauthState = state;
  req.session.codeVerifier = verifier;

  const url = new URL("/oauth/connect.php", CHANNELNOEL_BASE_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  res.redirect(url.toString());
});

// callback
app.get("/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send("Connexion refusée par ChannelNoel.");
    }


const errors = [];

if (!code) {
  errors.push("Le paramètre code est absent de l'URL.");
}

if (!state) {
  errors.push("Le paramètre state est absent de l'URL.");
}

if (!req.session.oauthState) {
  errors.push("La session OAuth est absente ou expirée.");
}

if (state && req.session.oauthState && state !== req.session.oauthState) {
  errors.push("Le state reçu ne correspond pas au state enregistré dans la session.");
}

if (errors.length > 0) {
  return res.status(400).send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Erreur</title>
      <style>
        body {
          background: #0f172a;
          color: white;
          font-family: Arial;
          padding: 30px;
        }
        .card {
          max-width: 650px;
          margin: 50px auto;
          background: #1e293b;
          padding: 30px;
          border-radius: 15px;
        }
        h1 { color: #ef4444; }
        li { margin: 15px 0; color: #fca5a5; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Erreur de vérification OAuth</h1>
        <p>Erreur :</p>
        <ul>
          ${errors.map(e => `<li>${escapeHtml(e)}</li>`).join("")}
        </ul>
      </div>
    </body>
    </html>
  `);
}


    const verifier = req.session.codeVerifier;

    delete req.session.oauthState;
    delete req.session.codeVerifier;

    // récup le token

	const tokenParams = new URLSearchParams();

	tokenParams.append("grant_type", "authorization_code");
	tokenParams.append("client_id", CLIENT_ID);
	tokenParams.append("client_secret", CLIENT_SECRET);
	tokenParams.append("code", code);
	tokenParams.append("redirect_uri", REDIRECT_URI);
	tokenParams.append("code_verifier", verifier);

	const tokenResponse = await fetch(
	  new URL("/oauth/token.php", CHANNELNOEL_BASE_URL),
	  {
		method: "POST",
		headers: {
		  "Content-Type": "application/x-www-form-urlencoded",
		  "Accept": "application/json"
		},
		body: tokenParams.toString()
	  }
	);


	const tokenText = await tokenResponse.text();

	let tokenData;

	try {
	  tokenData = JSON.parse(tokenText);
	} catch {
	  console.error("La réponse n'est pas du JSON valide.");
	  return res.status(502).send("Réponse invalide du serveur OAuth.");
	}

	if (!tokenResponse.ok) {
	  return res.status(400).send(
		"Erreur OAuth : " + JSON.stringify(tokenData)
	  );
	}

    const accessToken =
      tokenData.access_token || tokenData.token;

    if (!accessToken) {
      return res.status(502).send(
        "Le serveur ChannelNoel n'a pas renvoyé de token reconnu."
      );
    }

    // compte
    const userResponse = await fetch(
      new URL("/oauth/me.php", CHANNELNOEL_BASE_URL),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
	

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Erreur profil:", userData);
      return res.status(400).send("Impossible de récupérer le profil.");
    }

    // créer une session
    await new Promise((resolve, reject) => {
      req.session.regenerate(err => err ? reject(err) : resolve());
    });

    req.session.user = userData.user;
    req.session.accessToken = accessToken;

    res.redirect("/");

  } catch (error) {
    console.error(error);
    res.status(500).send("Une erreur est survenue.");
  }
});

// logout
app.post("/logout", async (req, res) => {
  try {
    if (req.session.accessToken) {
      const revokeResponse = await fetch(
        new URL("/oauth/revoke.php", CHANNELNOEL_BASE_URL),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${req.session.accessToken}`
          }
        }
      );

      if (!revokeResponse.ok) {
        console.error("La révocation OAuth a échoué.");
      }
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur lors de la déconnexion.");
  }
});

app.listen(PORT || 3000, () => {
  console.log(`Serveur sur le port ${PORT || 3000}`);
});
