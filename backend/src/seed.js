require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Product, Negotiation, Chat, Auction, Bid, Order, Receipt, Review, Event } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusx';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  console.log('Clearing old data...');
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Negotiation.deleteMany({}),
    Chat.deleteMany({}),
    Auction.deleteMany({}),
    Bid.deleteMany({}),
    Order.deleteMany({}),
    Receipt.deleteMany({}),
    Review.deleteMany({}),
    Event.deleteMany({}),
  ]);

  console.log('Creating demo student users...');
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const rahul = await User.create({
    name: 'Rahul Sharma',
    email: 'rahul@lpu.in',
    university: 'Lovely Professional University',
    password_hash: defaultPasswordHash,
    student_verified: true,
    phone: '+91 98765 43210',
    profile_image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop',
    rating: { average: 4.8, total_reviews: 12 },
    stats: { completed_sales: 11, offers_received: 24, offers_replied: 23 },
  });

  const sneha = await User.create({
    name: 'Sneha Patel',
    email: 'sneha@university.edu',
    university: 'University Campus',
    password_hash: defaultPasswordHash,
    student_verified: true,
    phone: '+91 98111 22334',
    profile_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
    rating: { average: 4.9, total_reviews: 16 },
    stats: { completed_sales: 15, offers_received: 30, offers_replied: 29 },
  });

  const amit = await User.create({
    name: 'Amit Kumar',
    email: 'amit@lpu.in',
    university: 'Lovely Professional University',
    password_hash: defaultPasswordHash,
    student_verified: true,
    phone: '+91 97234 56789',
    profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop',
    rating: { average: 4.6, total_reviews: 8 },
    stats: { completed_sales: 7, offers_received: 14, offers_replied: 13 },
  });

  const priya = await User.create({
    name: 'Priya Verma',
    email: 'priya@university.edu',
    university: 'University Campus',
    password_hash: defaultPasswordHash,
    student_verified: true,
    phone: '+91 99887 76655',
    profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
    rating: { average: 4.7, total_reviews: 9 },
    stats: { completed_sales: 8, offers_received: 18, offers_replied: 17 },
  });

  const vikram = await User.create({
    name: 'Vikram Singh',
    email: 'vikram@campusx.edu',
    university: 'CampusX Tech Institute',
    password_hash: defaultPasswordHash,
    student_verified: true,
    phone: '+91 91234 56780',
    profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop',
    rating: { average: 4.5, total_reviews: 5 },
    stats: { completed_sales: 4, offers_received: 10, offers_replied: 9 },
  });

  console.log('Seeding products across student categories...');
  const products = await Product.create([
    {
      seller_id: rahul._id,
      title: 'Apple MacBook Air M1 (8GB / 256GB SSD) Space Grey',
      description: 'Used for 3 semesters of coding assignments. Battery health 91%, flawless screen, original 30W USB-C charger and original box included.',
      category: 'Laptops',
      subcategory: 'Apple MacBooks',
      price: 44000,
      minimum_price: 41000,
      condition: 'Like New',
      listing_type: 'negotiable',
      location: 'Central Library / Block 34 Gate',
      images: ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop'],
      attributes: { processor: 'Apple M1 8-Core', ram: '8GB Unified', storage: '256GB SSD', battery_cycle_count: 142 },
      views: 184,
    },
    {
      seller_id: rahul._id,
      title: 'Lenovo ThinkPad T480 (Core i5 8th Gen, 16GB RAM, 512GB SSD)',
      description: 'The ultimate Linux / student coding laptop. Dual hot-swappable batteries, backlit legendary keyboard, pristine trackpoint.',
      category: 'Laptops',
      subcategory: 'Business Laptops',
      price: 18500,
      minimum_price: 17000,
      condition: 'Good',
      listing_type: 'fixed',
      location: 'Boys Hostel 4 Common Room',
      images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop'],
      attributes: { processor: 'Intel Core i5-8350U', ram: '16GB DDR4', storage: '512GB NVMe', os: 'Ubuntu 24.04 / Win 11 Pro' },
      views: 92,
    },
    {
      seller_id: sneha._id,
      title: 'iPad 9th Gen 64GB Wi-Fi + Apple Pencil 1st Gen',
      description: 'Perfect setup for lecture notes, digital art, and PDF reading. Paperlike screen protector pre-applied. Includes magnetic folio case.',
      category: 'Laptops',
      subcategory: 'Tablets',
      price: 21000,
      minimum_price: 19000,
      condition: 'Like New',
      listing_type: 'auction',
      location: 'Design Studio Cafe',
      images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop'],
      attributes: { screen_size: '10.2 inch Retina', storage: '64GB', accessories: 'Apple Pencil + Case' },
      views: 210,
    },
    {
      seller_id: sneha._id,
      title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
      description: 'Industry-leading noise cancelling, ideal for study sessions in noisy dorms. 30hr battery life, carry case and audio cable included.',
      category: 'Laptops',
      subcategory: 'Audio',
      price: 13500,
      minimum_price: 12000,
      condition: 'Good',
      listing_type: 'negotiable',
      location: 'Food Court 2',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop'],
      attributes: { battery_life: '30 hours', connection: 'Bluetooth 5.0 + 3.5mm' },
      views: 78,
    },
    {
      seller_id: amit._id,
      title: 'Hero Sprint Pro 21-Speed Mountain Bicycle',
      description: 'Dual disc brakes, front suspension, 21-speed Shimano gears. Perfect for rushing between lecture halls across campus. Includes cable lock.',
      category: 'Cycles',
      subcategory: 'Gear Cycles',
      price: 6500,
      minimum_price: 5800,
      condition: 'Good',
      listing_type: 'negotiable',
      location: 'Block 12 Bicycle Stand',
      images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop'],
      attributes: { gear_system: 'Shimano Tourney 21S', frame_size: '18 inch Alloy', brake_type: 'Dual Disc' },
      views: 145,
    },
    {
      seller_id: amit._id,
      title: 'Decathlon Btwin Riverside Single Speed City Cycle',
      description: 'Lightweight hybrid bicycle, very low maintenance. Smooth rolling 700c wheels, recently serviced with new brake pads.',
      category: 'Cycles',
      subcategory: 'City Cycles',
      price: 3200,
      minimum_price: 2800,
      condition: 'Like New',
      listing_type: 'auction',
      location: 'Sports Complex Entrance',
      images: ['https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&auto=format&fit=crop'],
      attributes: { frame_material: 'Steel', wheel_size: '700c' },
      views: 67,
    },
    {
      seller_id: priya._id,
      title: 'Introduction to Algorithms (CLRS 4th Edition)',
      description: 'Standard textbook for Data Structures and Algorithms. Crisp white pages, zero highlighter marks, hardcover international student edition.',
      category: 'Books',
      subcategory: 'Computer Science',
      price: 850,
      minimum_price: 700,
      condition: 'Like New',
      listing_type: 'negotiable',
      location: 'Reading Hall Floor 2',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop'],
      attributes: { author: 'Cormen, Leiserson, Rivest, Stein', edition: '4th Edition', semester: 'Sem 3/4' },
      views: 160,
    },
    {
      seller_id: priya._id,
      title: 'HC Verma Concepts of Physics (Part 1 & Part 2 Set)',
      description: 'Complete 2-volume physics reference with solved campus physics examples. Essential for engineering mechanics and general physics.',
      category: 'Books',
      subcategory: 'Engineering Sciences',
      price: 490,
      minimum_price: 400,
      condition: 'Good',
      listing_type: 'fixed',
      location: 'Central Library',
      images: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop'],
      attributes: { author: 'Dr. H.C. Verma', volumes: 'Both Part 1 & 2' },
      views: 110,
    },
    {
      seller_id: rahul._id,
      title: 'Casio FX-991CW ClassWiz Scientific Calculator',
      description: 'Latest high-resolution scientific calculator approved by exam boards. Matrix, vector, equation solver and statistics functions.',
      category: 'Laptops',
      subcategory: 'Calculators',
      price: 1150,
      minimum_price: 1000,
      condition: 'Like New',
      listing_type: 'fixed',
      location: 'Block 26 Canteen',
      images: ['https://images.unsplash.com/photo-1611125832047-1d7ad1e8e485?w=800&auto=format&fit=crop'],
      attributes: { model: 'fx-991CW', functions: '540+ functions' },
      views: 88,
    },
    {
      seller_id: vikram._id,
      title: 'One8 Annual Campus Fest VIP Pass (Backstage Access)',
      description: 'VIP entry wristband + backstage lounge access for the upcoming university spring cultural fest and celebrity DJ night.',
      category: 'Tickets',
      subcategory: 'Campus Fests',
      price: 1200,
      minimum_price: 1000,
      condition: 'New',
      listing_type: 'auction',
      location: 'Student Activity Center',
      images: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop'],
      attributes: { event_date: 'March 28, 2026', access_tier: 'VIP Backstage' },
      views: 240,
    },
    {
      seller_id: vikram._id,
      title: 'Nike Air Pegasus 39 Running Shoes (UK 9 / US 10)',
      description: 'Zoom Air cushioning, engineered mesh upper. Only worn twice on the campus athletics track. Super clean outsoles.',
      category: 'Shoes',
      subcategory: 'Running Shoes',
      price: 3600,
      minimum_price: 3200,
      condition: 'Like New',
      listing_type: 'negotiable',
      location: 'Ground Floor Gym Entrance',
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop'],
      attributes: { shoe_size: 'UK 9 / EU 43', colorway: 'Total Orange / Black' },
      views: 130,
    },
    {
      seller_id: sneha._id,
      title: 'Interstellar Movie Minimalist Framed Canvas Poster',
      description: 'Matte black framed A3 canvas poster of the Endurance spacecraft and Gargantua black hole. Adds instant style to your dorm room wall.',
      category: 'Posters',
      subcategory: 'Dorm Decor',
      price: 450,
      minimum_price: 350,
      condition: 'New',
      listing_type: 'fixed',
      location: 'Girls Hostel Gate 2',
      images: ['https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop'],
      attributes: { dimensions: 'A3 (29.7 x 42 cm)', frame: 'Wood Composite Matte Frame' },
      views: 95,
    },
  ]);

  const [macbook, thinkpad, ipad, sonyAudio, cycle, btwin, clrsBook, hcVerma, casio, festPass, nikeShoes, poster] = products;

  console.log('Creating live & past auctions with atomic bids...');
  // 1. Live Auction: iPad 9th Gen
  const liveAuction1 = await Auction.create({
    product_id: ipad._id,
    seller_id: sneha._id,
    starting_price: 18000,
    current_highest_bid: 21500,
    highest_bidder_id: rahul._id,
    start_time: new Date(Date.now() - 3600 * 1000 * 24),
    end_time: new Date(Date.now() + 3600 * 1000 * 48), // ends in 2 days
    status: 'active',
  });
  await Product.findByIdAndUpdate(ipad._id, { status: 'reserved' });

  await Bid.create([
    { auction_id: liveAuction1._id, bidder_id: amit._id, bid_amount: 19000, created_at: new Date(Date.now() - 3600 * 1000 * 18) },
    { auction_id: liveAuction1._id, bidder_id: priya._id, bid_amount: 20500, created_at: new Date(Date.now() - 3600 * 1000 * 8) },
    { auction_id: liveAuction1._id, bidder_id: rahul._id, bid_amount: 21500, created_at: new Date(Date.now() - 3600 * 1000 * 2) },
  ]);

  // 2. Live Auction: Fest Pass
  const liveAuction2 = await Auction.create({
    product_id: festPass._id,
    seller_id: vikram._id,
    starting_price: 900,
    current_highest_bid: 1350,
    highest_bidder_id: priya._id,
    start_time: new Date(Date.now() - 3600 * 1000 * 12),
    end_time: new Date(Date.now() + 3600 * 1000 * 18), // ends in 18 hours
    status: 'active',
  });
  await Product.findByIdAndUpdate(festPass._id, { status: 'reserved' });

  await Bid.create([
    { auction_id: liveAuction2._id, bidder_id: rahul._id, bid_amount: 1100, created_at: new Date(Date.now() - 3600 * 1000 * 6) },
    { auction_id: liveAuction2._id, bidder_id: priya._id, bid_amount: 1350, created_at: new Date(Date.now() - 3600 * 1000 * 1) },
  ]);

  console.log('Creating sample negotiations and live chat history...');
  // Negotiation: Amit offering on Rahul's MacBook
  const negMacbook = await Negotiation.create({
    product_id: macbook._id,
    seller_id: rahul._id,
    buyer_id: amit._id,
    offers: [
      { offered_by: amit._id, amount: 39000, status: 'countered', at: new Date(Date.now() - 3600 * 1000 * 10) },
      { offered_by: rahul._id, amount: 42500, status: 'countered', at: new Date(Date.now() - 3600 * 1000 * 6) },
      { offered_by: amit._id, amount: 41500, status: 'pending', at: new Date(Date.now() - 3600 * 1000 * 2) },
    ],
    negotiation_status: 'active',
  });

  await Chat.create([
    { negotiation_id: negMacbook._id, sender_id: amit._id, text: 'Hey Rahul, does this MacBook have any dents on the corners?', created_at: new Date(Date.now() - 3600 * 1000 * 9) },
    { negotiation_id: negMacbook._id, sender_id: rahul._id, text: 'Zero dents! Always kept inside a Tomtoc padded sleeve. You can inspect it at Central Library.', created_at: new Date(Date.now() - 3600 * 1000 * 5) },
    { negotiation_id: negMacbook._id, sender_id: amit._id, text: 'Awesome, countered at 41,500. If that works for you, let’s meet tomorrow.', created_at: new Date(Date.now() - 3600 * 1000 * 2) },
  ]);

  console.log('Creating completed orders, payments, receipts, and verified reviews...');
  // Past completed order 1: Priya bought CLRS book from Rahul
  const pastOrder1 = await Order.create({
    product_id: clrsBook._id,
    buyer_id: priya._id,
    seller_id: rahul._id,
    amount: 800,
    source: 'negotiation',
    status: 'completed',
    payment_ref: 'MOCK-PAY-882193',
    buyer_confirmed: true,
    seller_confirmed: true,
    meeting: { location: 'Central Library Floor 2', time: new Date(Date.now() - 3600 * 1000 * 24 * 5) },
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 6),
  });

  await Receipt.create({
    receipt_no: 'CX-2026-00001',
    order_id: pastOrder1._id,
    buyer_id: priya._id,
    seller_id: rahul._id,
    product: { id: clrsBook._id, title: clrsBook.title },
    amount: 800,
    payment_ref: 'MOCK-PAY-882193',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 5),
  });

  await Review.create({
    order_id: pastOrder1._id,
    reviewer_id: priya._id,
    reviewed_user_id: rahul._id,
    product_id: clrsBook._id,
    seller_rating: 5,
    product_quality_rating: 5,
    communication_rating: 5,
    comment: 'Book was in flawless condition just as described. Rahul arrived right on time at the library!',
    verified_purchase: true,
  });

  // Past completed order 2: Sneha bought ThinkPad from Rahul
  const pastOrder2 = await Order.create({
    product_id: thinkpad._id,
    buyer_id: sneha._id,
    seller_id: rahul._id,
    amount: 18500,
    source: 'fixed',
    status: 'completed',
    payment_ref: 'MOCK-PAY-993214',
    buyer_confirmed: true,
    seller_confirmed: true,
    meeting: { location: 'Block 34 Cafeteria', time: new Date(Date.now() - 3600 * 1000 * 24 * 12) },
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 14),
  });

  await Receipt.create({
    receipt_no: 'CX-2026-00002',
    order_id: pastOrder2._id,
    buyer_id: sneha._id,
    seller_id: rahul._id,
    product: { id: thinkpad._id, title: thinkpad.title },
    amount: 18500,
    payment_ref: 'MOCK-PAY-993214',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 12),
  });

  await Review.create({
    order_id: pastOrder2._id,
    reviewer_id: sneha._id,
    reviewed_user_id: rahul._id,
    product_id: thinkpad._id,
    seller_rating: 5,
    product_quality_rating: 5,
    communication_rating: 4,
    comment: 'ThinkPad keyboard and dual battery are amazing. Clean Ubuntu setup. Great seller!',
    verified_purchase: true,
  });

  console.log('Seeding user interaction events for the ML recommender & analytics...');
  await Event.create([
    { user_id: amit._id, product_id: macbook._id, type: 'view' },
    { user_id: amit._id, product_id: macbook._id, type: 'search', query: 'macbook m1 laptop' },
    { user_id: amit._id, product_id: casio._id, type: 'view' },
    { user_id: amit._id, product_id: cycle._id, type: 'view' },
    { user_id: priya._id, product_id: clrsBook._id, type: 'purchase' },
    { user_id: priya._id, product_id: hcVerma._id, type: 'view' },
    { user_id: priya._id, product_id: poster._id, type: 'view' },
    { user_id: sneha._id, product_id: thinkpad._id, type: 'purchase' },
    { user_id: sneha._id, product_id: macbook._id, type: 'view' },
    { user_id: rahul._id, product_id: nikeShoes._id, type: 'view' },
    { user_id: rahul._id, product_id: cycle._id, type: 'view' },
    { user_id: vikram._id, product_id: sonyAudio._id, type: 'view' },
  ]);

  console.log('\nSeed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Login credentials for testing (All passwords: password123):');
  console.log('1. rahul@lpu.in      - CS undergrad (Seller: MacBook, Calculator)');
  console.log('2. sneha@university.edu - Design student (Seller: iPad, Sony XM4, Poster)');
  console.log('3. amit@lpu.in       - Mech Engg (Buyer for MacBook, Seller for Cycle)');
  console.log('4. priya@university.edu - Biotech student (Buyer: CLRS, Auction bidder)');
  console.log('5. vikram@campusx.edu - Fest Organizer (Seller: Fest VIP pass, Nike shoes)');
  console.log('----------------------------------------------------\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

