const listingSchema = {
  title: String,
  description: String,
  price: Number,
  category: ['ostetaan', 'myydään', 'annetaan', 'vuokrataan'],
  seller: ObjectId, // Linkki käyttäjään
  createdAt: Date
};