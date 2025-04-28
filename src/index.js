// Importations des modules nécessaires
import express from "express";
import session from 'express-session';
import connectMongo from 'connect-mongodb-session'; // Assure-toi que 'connect-mongodb-session' est bien installé

import bcrypt from 'bcrypt';
import multer from "multer";
import User from "./mongodb.js";  // Assure-toi d'ajouter l'extension .js
import VenteVoiture from "./voiture.js";  // Assure-toi d'ajouter l'extension .js
import Favorite from './favorites.js';   // Assure-toi d'ajouter l'extension .js
import fs from 'fs';
import jwt from 'jsonwebtoken';
import mailgun from "mailgun-js";
import _ from 'lodash';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path'; // Assure-toi d'importer path
import { fileURLToPath } from 'url';

// Création de l'application Express
const app = express();

// Définition de __filename et __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Définition du chemin des templates
const templatePath = path.join(__dirname, "../templates");

// Configuration d'Express
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json()); // Middleware pour gérer les requêtes JSON
app.use(express.urlencoded({ extended: false })); // Middleware pour gérer les requêtes URL encodées
app.use(express.static("public")); // Définition du dossier des fichiers statiques
app.use("/public", express.static(path.join(__dirname, "public"), { extensions: ["css"] }));

// Configuration du moteur de template
app.set("view engine", "hbs"); // Utilisation de Handlebars comme moteur de template
app.set("views", templatePath); // Définition du dossier des vues

// Configuration de multer pour la gestion des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads-cars/");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const userStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads-users/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadUserImage = multer({ storage: userStorage });

// Instancier le connectMongoSession correctement
const MongoDBSession = connectMongo(session);

// Définir l'URL de la base de données MongoDB (assurez-vous que cette URL est correcte)
const store = new MongoDBSession({
  uri: process.env.MONGO_URI || "mongodb://localhost:27017/taBaseDeDonnees", // Remplace par ton URL de MongoDB
  collection: 'sessions'
});

// Utiliser MongoDBSession pour les sessions dans Express
app.use(session({
  secret: 'tonSecretIci',  // Choisis un secret aléatoire
  resave: false,
  saveUninitialized: false,
  store: store,  // Utilisation du store MongoDB pour les sessions
  cookie: { secure: false } // Modifie à `true` si tu utilises HTTPS
}));

// Routes de l'application

// Route pour l'utilisateur
app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // Utilisation du modèle User pour trouver l'utilisateur par son ID
    if (user) {
      res.json(user);
    } else {
      res.status(404).send('Utilisateur non trouvé');
    }
  } catch (err) {
    res.status(500).send('Erreur du serveur');
  }
});

app.get("/", (req, res) => res.render("home"));

app.get("/login", (req, res) => res.render("login"));
app.get("/inscription", (req, res) => res.render("inscription"));
app.get("/support", (req, res) => res.render("support"));
app.get("/home2", (req, res) => res.render("home2"));
app.get("/datavoiture", (req, res) => res.render("datavoiture"));
app.get("/otp", (req, res) => res.render("otp"));
app.get("/Apropos", (req, res) => res.render("Apropos"));
app.get("/confirmation-vente", (req, res) => res.render("confirmation-vente"));
app.get("/search-results", (req, res) => res.render("search-results"));
app.get("/cart", (req, res) => res.render("cart"));
app.get("/acheter-voiture", (req, res) => res.render("acheter-voiture"));
app.get("/choisir-mode-paiement", (req, res) => res.render("choisir-mode-paiement"));
app.get("/paiement-espece", (req, res) => res.render("paiement-espece"));
app.get("/cart2", (req, res) => res.render("cart2"));

// Exportation de l'app pour utilisation ailleurs si nécessaire

// Configuration de la session MongoDB


// Utilisation de la session avec Express
app.use(session({
  secret: 'key that will sign cookie',
  resave: false,
  saveUninitialized: false,
  store: store
}));

// Middleware pour vérifier l'authentification de l'utilisateur
const isAuth = (req, res, next) => {
  if (req.session.isAuth) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Route pour la page d'accueil après connexion
app.get("/home", isAuth, async (req, res) => {
  try {
    // Récupérer le nom d'utilisateur et l'image de profil de l'utilisateur en session
    const username = req.session.username;
    const user = await User.findOne({ username }); // Utilisation du modèle User pour trouver l'utilisateur par son nom d'utilisateur
    const userImage = user ? user.image : "/uploads-users/default-image.png"; // Récupérer le chemin de l'image de profil de l'utilisateur ou utiliser une image par défaut

    // Rendre la page home en passant le nom d'utilisateur et le chemin de l'image de profil au modèle
    res.render("home", { username, userImage });
  } catch (error) {
    console.error("Erreur lors de la récupération des données de l'utilisateur :", error);
    res.status(500).send('Erreur du serveur');
  }
});



// Route pour la déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion :", err);
      res.status(500).send("Erreur lors de la déconnexion. Veuillez réessayer.");
    } else {
      res.redirect("/login");
    }
  });
});
app.get("/support", (req, res, next) => {
  if (!req.session.isAuth) {
    return res.redirect("/login");
  }
  next();
}, (req, res) => res.render("support"));


// Route pour afficher toutes les voitures disponibles
app.get("/voitures-disponibles", async (req, res) => {
  try {
    const voituresDisponibles = await VenteVoiture.find();
    res.render("voitures-disponibles", { voitures: voituresDisponibles });
  } catch (error) {
    console.error("Erreur lors de la récupération des voitures disponibles :", error);
    res.status(500).send("Erreur lors de la récupération des voitures disponibles. Veuillez réessayer.");
  }
});

// Route pour afficher le paiement réussi
app.get('/paiement-reussi', (req, res) => res.render('paiement-reussi'));

// Route pour afficher le paiement échoué
app.get('/paiement-erreur', (req, res) => res.render('paiement-erreur'));


app.post("/inscription", uploadUserImage.single("profileImage"), async (req, res) => {
  try {
    // Récupération des données du formulaire
    const { username, email, phone, password, cin, city, country, postalcode } = req.body;

    // Vérification des champs requis
    if (!username || !email || !phone || !password || !cin || !city || !country || !postalcode) {
      throw new Error("Veuillez remplir tous les champs du formulaire.");
    }

    // Récupération du chemin de l'image de profil téléchargée, s'il existe
    const profileImageURL = req.file ? "/uploads-users/" + req.file.filename : "/uploads-users/default-image.png"; // Utilisez le chemin réel de l'image téléchargée

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur dans la base de données
    await User.create({ 
      username, 
      email, 
      phone, 
      password: hashedPassword, 
      cin, 
      city, 
      country, 
      postalcode, 
      image: profileImageURL // Enregistrez le chemin de l'image dans la base de données
    });

    // Redirection vers la page de connexion
    res.redirect("/login");
  } catch (error) {
    console.error("Une erreur s'est produite lors de l'inscription :", error);
    res.status(500).send("Une erreur s'est produite lors de l'inscription. Veuillez réessayer.");
  }
});


// Route pour la connexion de l'utilisateur
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      console.log("Utilisateur non trouvé");
      return res.render("login", { errorMessage: "Utilisateur non trouvé" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      console.log("Connexion réussie !");
      req.session.isAuth = true;
      req.session.username = username; // Enregistrement de l'utilisateur dans la session
      req.session.userId = user._id; // Enregistrement de l'identifiant de l'utilisateur dans la session
      res.redirect("/home");
    } else {
      console.log("Mot de passe incorrect");
      res.render("login", { errorMessage: "Mot de passe incorrect" });
    }
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    res.render("login", { errorMessage: "Erreur lors de la connexion" });
  }
});
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password"); // Affiche le formulaire de réinitialisation de mot de passe
});
app.get("/reset-password", (req, res) => {
  res.render("reset-password"); // Affiche le formulaire de réinitialisation de mot de passe
});




// Activation du compte utilisateur

// Route pour soumettre les données d'une nouvelle voiture
app.post("/datavoiture", (req, res, next) => {
  if (!req.session.isAuth) {
    return res.redirect("/login");
  }
  next();
}, upload.single("image"), async (req, res) => {
  try {
    // Récupération des données du formulaire
    const { brand, model, year, mileage, price, description, 'contact-name': contactName, 'first-registration': firstRegistration, fuel, gearbox, 'tax-power': taxPower, 'din-power': dinPower } = req.body;

    // Vérification de la présence de tous les champs nécessaires
    const requiredFields = ['brand', 'model', 'year', 'mileage', 'price', 'description', 'contact-name', 'first-registration', 'fuel', 'gearbox', 'tax-power', 'din-power'];
    const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].trim() === '');
    if (missingFields.length > 0 || !req.file) {
      const errorMessage = missingFields.length > 0 ? `Veuillez remplir les champs suivants : ${missingFields.join(', ')}` : "Veuillez ajouter une image.";
      throw new Error(errorMessage);
    }

    // Création d'une nouvelle instance de VenteVoiture avec les données du formulaire
    const newCar = new VenteVoiture({
      brand,
      model,
      year: parseInt(year), // Conversion en nombre pour les champs numériques
      mileage: parseInt(mileage),
      price: parseInt(price),
      description,
      contactName,
      carCondition: {
        firstRegistration: new Date(firstRegistration), // Conversion en objet Date pour la première immatriculation
        fuel,
        gearbox,
        taxPower: parseInt(taxPower),
        dinPower: parseInt(dinPower),
        image: "/uploads-cars/" + req.file.filename // Chemin du fichier image
      }
    });

    // Sauvegarde de la nouvelle voiture dans la base de données
    await newCar.save();

    // Redirection vers la page de confirmation avec un message de succès
    res.render("confirmation-vente", { message: "Annonce ajoutée avec succès !" });
  } catch (error) {
    console.error("Erreur lors de la soumission du formulaire :", error);
    // Renvoi d'une réponse d'erreur avec un code HTTP 500
    res.status(500).render("datavoiture", { error: error.message || "Erreur lors de la soumission du formulaire. Veuillez réessayer." });
  }
});
// Route pour rechercher des voitures par marque
app.get("/search", async (req, res) => {
  try {
    const { brand } = req.query;

    if (!brand) throw new Error("Veuillez saisir une marque pour la recherche.");

    const cars = await VenteVoiture.find({ brand: { $regex: new RegExp(brand, "i") } });
    const carsWithFullImageURLs = cars.map(car => ({
      ...car.toJSON(),
      image: `http://localhost:5000${car.image}`
    }));

    res.render("search-results", { cars: carsWithFullImageURLs });
  } catch (error) {
    console.error("Erreur lors de la recherche :", error);
    res.status(500).send("Erreur lors de la recherche. Veuillez réessayer.");
  }
});

// Middleware pour la sécurité des connexions
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "connect-src * https://api.stripe.com https://*.stripe.com;");
  next();
});

app.get("/car-details/:carId", async (req, res) => {
  try {
    const carId = req.params.carId;
    if (!carId) throw new Error("L'identifiant de la voiture n'est pas fourni");
    const car = await VenteVoiture.findById(carId);
    if (!car) throw new Error("Voiture non trouvée");
    res.render("car-details", { car, carJSON: JSON.stringify(car) });
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de la voiture :", error);
    res.status(400).send("Erreur lors de la récupération des détails de la voiture. Veuillez réessayer.");
  }
});


// Route pour ajouter une voiture aux favoris
app.post("/add-to-favorites/:carId", isAuth, async (req, res) => {
  try {
    const userId = req.session.userId; // Supposons que vous stockiez l'ID de l'utilisateur dans la session
    const carId = req.params.carId;

    // Assurez-vous que userId est défini
    if (!userId) {
      throw new Error("L'identifiant de l'utilisateur n'est pas trouvé.");
    }

    // Création de l'objet "Favorite" avec l'ID de l'utilisateur et l'ID de la voiture
    const newFavorite = new Favorite({ user: userId, car: carId });

    // Sauvegarde de l'objet "Favorite" dans la base de données
    await newFavorite.save();

    res.status(200).send("La voiture a été ajoutée aux favoris de l'utilisateur.");
  } catch (error) {
    console.error("Erreur lors de l'ajout de la voiture aux favoris :", error);
    res.status(500).send("Erreur lors de l'ajout de la voiture aux favoris. Veuillez réessayer.");
  }
});

// Route pour créer une session de paiement Stripe pour une voiture spécifique
app.post("/create-checkout-session/:carId", async (req, res) => {
  try {
    const carId = req.params.carId;

    // Création d'une session de paiement avec Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Nom du produit', // Vous pouvez mettre un nom de produit ici si nécessaire
          },
          unit_amount: 5000, // Montant en centimes (par exemple, 50 € * 100)
        },
        quantity: 1, // Quantité de voitures à acheter
      }],
      mode: 'payment',
      success_url: '/paiement-reussi', // URL à rediriger après un paiement réussi
      cancel_url: '/paiement-erreur', // URL à rediriger en cas d'annulation du paiement
    });

    // Retourner l'ID de la session de paiement
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Erreur lors de la création de la session de paiement :", error);
    res.status(500).json({ error: "Erreur lors de la création de la session de paiement" });
  }
});
// Route pour afficher les voitures favorites de l'utilisateur
app.get("/favorites", isAuth, async (req, res) => {
  try {
    const userId = req.session.userId; // Récupération de l'ID de l'utilisateur depuis la session

    // Récupération des voitures favorites de l'utilisateur depuis la base de données
    const favorites = await Favorite.find({ user: userId }).populate('car');

    // Rendu de la page favorites.hbs avec les données des voitures favorites
    res.render("favorites", { favorites });
  } catch (error) {
    console.error("Erreur lors de la récupération des voitures favorites :", error);
    res.status(500).send("Erreur lors de la récupération des voitures favorites. Veuillez réessayer.");
  }
});
app.get('/choisir-mode-paiement/:carId', (req, res) => {
  const carId = req.params.carId;
  // Utilisez carId pour effectuer des opérations nécessaires, comme récupérer les détails de la voiture et afficher la page de choix de mode de paiement
  // Par exemple :
  res.render('choisir-mode-paiement', { carId: carId }); // Rendu de la page choisir-mode-paiement avec le carId
});

app.get("/dashboard", async (req, res) => {
  try {
      const numUsers = await User.countDocuments();
      const numCars = await VenteVoiture.countDocuments();
      const users = await User.find();
      const cars = await VenteVoiture.find();
      res.render("dashboard", { numUsers, numCars, users, cars });
  } catch (error) {
      console.error("Erreur lors de la récupération du nombre de voitures et d'utilisateurs :", error);
      res.status(500).send("Erreur lors de la récupération du nombre de voitures et d'utilisateurs. Veuillez réessayer.");
  }
});
app.post('/dashboard/cars/:carId', async (req, res) => {
  const carId = req.params.carId;
  const updatedCarData = req.body; // Les nouvelles données de la voiture envoyées dans le corps de la requête
  try {
    // Mettre à jour les détails de la voiture dans la base de données
    await VenteVoiture.findByIdAndUpdate(carId, updatedCarData);
    res.status(200).send('Les détails de la voiture ont été mis à jour avec succès.');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des détails de la voiture :', error);
    res.status(500).send('Une erreur est survenue lors de la mise à jour des détails de la voiture.');
  }
});


// Route pour l'achat d'une voiture et suppression de l'annonce
app.post('/acheter-voiture', async (req, res) => {
  try {
      const voitureId = req.body.voitureId; // Supposons que vous envoyez l'ID de la voiture dans le corps de la requête

      // Supprimer la voiture de la base de données
      await VenteVoiture.findByIdAndRemove(voitureId);

      res.status(200).json({ message: 'La voiture a été achetée avec succès.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Une erreur s\'est produite lors de l\'achat de la voiture.' });
  }
});


// Route pour supprimer une voiture des favoris de l'utilisateur
app.post("/remove-from-favorites/:carId", isAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const carId = req.params.carId;

    // Supprimez le favori de la base de données
    await Favorite.findOneAndDelete({ car: carId, user: userId });

    res.status(200).send("La voiture a été retirée des favoris de l'utilisateur.");
  } catch (error) {
    console.error("Erreur lors de la suppression de la voiture des favoris :", error);
    res.status(500).send("Erreur lors de la suppression de la voiture des favoris. Veuillez réessayer.");
  }
});
// Route pour la page de connexion
app.get("/connexion", (req, res) => {
  res.render("connexion");
});
app.get("/user", (req, res) => {
  res.render("user");
});
app.get("/cars", (req, res) => {
  res.render("cars");
});
// Route pour mettre à jour les détails d'une voiture

// Route pour gérer la soumission du formulaire de connexion
app.post("/connexion", (req, res) => {
  const { username, password } = req.body;
  // Votre logique de vérification des informations de connexion
  if ((username === "redaboukir" || username === "fahd") && password === "reda") {
      req.session.user = username;
      res.redirect("/dashboard"); // Redirection vers le tableau de bord si les informations de connexion sont correctes
  } else {
      res.render("connexion", { errorMessage: "Identifiants incorrects" }); // Passer l'erreur dans le contexte lors du rendu de la page de connexion
  }
});

// Route pour récupérer le nombre de voitures et d'utilisateurs

// Route pour l'achat d'une voiture
app.post("/acheter-voiture/:id", async (req, res) => {
  try {
    const voitureId = req.params.id;
    await VenteVoiture.findByIdAndDelete(voitureId);
    res.redirect("/confirmation-vente");
  } catch (error) {
    console.error("Erreur lors de l'achat de la voiture :", error);
    res.status(500).send("Erreur lors de l'achat de la voiture. Veuillez réessayer.");
  }
});


// Route pour récupérer tous les utilisateurs
app.get("/dashboard", async (req, res) => {
  try {
      const numUsers = await User.countDocuments();
      const numCars = await VenteVoiture.countDocuments();
      const users = await User.find();
      const cars = await VenteVoiture.find();
      res.render("dashboard", { numUsers, numCars, users, cars });
  } catch (error) {
      console.error("Erreur lors de la récupération du nombre de voitures et d'utilisateurs :", error);
      res.status(500).send("Erreur lors de la récupération du nombre de voitures et d'utilisateurs. Veuillez réessayer.");
  }
});

app.post("/dashboard/delete-user/:userId", async (req, res) => {
  const userId = req.params.userId;  // Accès correct aux paramètres de l'URL via `req`
  try {
      await User.findByIdAndDelete(userId);
      res.redirect("/dashboard");
  } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur :", error);
      res.status(500).send("Erreur lors de la suppression de l'utilisateur. Veuillez réessayer.");
  }
});

app.post("/dashboard/delete-car/:carId", async (req, res) => {
  const carId = req.params.carId;
  try {
      await VenteVoiture.findByIdAndDelete(carId);
      res.redirect("/dashboard");
  } catch (error) {
      console.error("Erreur lors de la suppression de la voiture :", error);
      res.status(500).send("Erreur lors de la suppression de la voiture. Veuillez réessayer.");
  }
});
app.get("/dashboard/car-details/:carId", async (req, res) => {
  const carId = req.params.carId;
  try {
      const car = await VenteVoiture.findById(carId);
      res.json(car); // Renvoie les détails de la voiture au format JSON
  } catch (error) {
      console.error("Erreur lors de la récupération des détails de la voiture :", error);
      res.status(500).send("Erreur lors de la récupération des détails de la voiture. Veuillez réessayer.");
  }
});


// Route pour récupérer toutes les voitures
app.get("/dashboard/cars", async (req, res) => {
  try {
    const cars = await VenteVoiture.find();
    res.render("dashboard-cars", { cars });
  } catch (error) {
    console.error("Erreur lors de la récupération des voitures :", error);
    res.status(500).send("Erreur lors de la récupération des voitures. Veuillez réessayer.");
  }
});
app.post("/dashboard/delete-user/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
      await User.findByIdAndDelete(userId);
      res.redirect("/dashboard"); // Redirige vers la page du tableau de bord après la suppression
  } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur :", error);
      res.status(500).send("Erreur lors de la suppression de l'utilisateur. Veuillez réessayer.");
  }
});

// Supprimer une voiture
app.post("/dashboard/delete-car/:carId", async (req, res) => {
  const carId = req.params.carId;
  try {
      await VenteVoiture.findByIdAndDelete(carId);
      res.redirect("/dashboard"); // Redirige vers la page du tableau de bord après la suppression
  } catch (error) {
      console.error("Erreur lors de la suppression de la voiture :", error);
      res.status(500).send("Erreur lors de la suppression de la voiture. Veuillez réessayer.");
  }
});

app.get("/dashboard/user-details/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
      const user = await User.findById(userId);
      res.json(user); // Renvoie les détails de l'utilisateur au format JSON
  } catch (error) {
      console.error("Erreur lors de la récupération des détails de l'utilisateur :", error);
      res.status(500).send("Erreur lors de la récupération des détails de l'utilisateur. Veuillez réessayer.");
  }
});
app.get("/user/:userId", async (req, res) => {
  // Récupérer l'ID de l'utilisateur à partir des paramètres de la requête
  const userId = req.params.userId;
  // Récupérer les détails de l'utilisateur à partir de la base de données en fonction de l'ID
  // Puis rendre la page user.hbs avec les détails de l'utilisateur
});
app.get("/car/:carId", async (req, res) => {
  // Récupérer l'ID de la voiture à partir des paramètres de la requête
  const carId = req.params.carId;
  // Récupérer les détails de la voiture à partir de la base de données en fonction de l'ID
  // Puis rendre la page cars.hbs avec les détails de la voiture
});

app.post('/create-checkout-session', async (req, res) => {
  const { carId } = req.body;

  try {
      // Récupérer les détails de la voiture à partir de la base de données
      const carDetails = await Car.findById(carId);

      if (!carDetails) {
          return res.status(404).json({ error: 'Voiture non trouvée' });
      }

      // Créer une session de paiement Stripe avec les détails de la voiture
      const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
              name: `${carDetails.brand} ${carDetails.model}`, // Utilisez la marque et le modèle de la voiture pour le nom
              images: [carDetails.carCondition.image], // Utilisez l'image de la voiture
              amount: carDetails.price * 100, // Le prix doit être en centimes
              currency: 'eur',
              quantity: 1,
          }],
          success_url: 'http://localhost:5000/paiement-erreur', // URL de redirection en cas de paiement réussi
          cancel_url: 'http://localhost:5000/paiement-reussi', // URL de redirection en cas d'annulation du paiement
      });

      res.json({ redirectUrl: session.url });
  } catch (error) {
      console.error("Erreur lors de la création de la session de paiement :", error);
      res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Exportation du routeur (inutile si vous n'utilisez pas ce fichier comme un module)
export default app;

  

