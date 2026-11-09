import React, { useState } from 'react';
import { X, Upload, PlusCircle, AlertCircle, Sparkles, CheckCircle2, Lock, Tag, Clock } from 'lucide-react';
import { api } from '../api';

const CATEGORIES = ['Laptops', 'Books', 'Cycles', 'Shoes', 'Tickets', 'Posters'];

export default function CreateListingModal({ isOpen, onClose, onCreated, onRequireAuth }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Laptops');
  const [price, setPrice] = useState('');
  const [minimumPrice, setMinimumPrice] = useState('');
  const [condition, setCondition] = useState('Good');
  const [listingType, setListingType] = useState('negotiable');
  const [location, setLocation] = useState('Central Library Entrance');
  const [imageUrl, setImageUrl] = useState('');

  // Auction specific
  const [auctionEndTime, setAuctionEndTime] = useState(
    new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16)
  );

  // Dynamic attributes
  const [laptopRam, setLaptopRam] = useState('16GB');
  const [laptopStorage, setLaptopStorage] = useState('512GB SSD');
  const [laptopProcessor, setLaptopProcessor] = useState('Intel Core i5 / M1');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookEdition, setBookEdition] = useState('');
  const [cycleGears, setCycleGears] = useState('21 Speed');
  const [shoeSize, setShoeSize] = useState('UK 9 / US 10');
  const [ticketDate, setTicketDate] = useState('');

  if (!isOpen) return null;

  async function handleImageFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError('');
      const res = await api.uploadImage(file);
      setImageUrl(res.url);
    } catch (err) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !price) {
      setError('Title and price are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Build attributes per category
      const attributes = {};
      if (category === 'Laptops') {
        attributes.ram = laptopRam;
        attributes.storage = laptopStorage;
        attributes.processor = laptopProcessor;
      } else if (category === 'Books') {
        attributes.author = bookAuthor;
        attributes.edition = bookEdition;
      } else if (category === 'Cycles') {
        attributes.gear_system = cycleGears;
      } else if (category === 'Shoes') {
        attributes.shoe_size = shoeSize;
      } else if (category === 'Tickets') {
        attributes.event_date = ticketDate;
      }

      // Step 1: Create Product
      const product = await api.createProduct({
        title,
        description,
        category,
        price: Number(price),
        minimum_price: minimumPrice ? Number(minimumPrice) : undefined,
        condition,
        listing_type: listingType,
        location,
        images: imageUrl ? [imageUrl] : [],
        attributes,
      });

      // Step 2: If auction, create active auction
      if (listingType === 'auction') {
        await api.createAuction({
          product_id: product._id,
          starting_price: Number(price),
          end_time: new Date(auctionEndTime).toISOString(),
        });
      }

      onCreated(product);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <PlusCircle className="w-3.5 h-3.5" /> List an Item for Resale
          </div>
          <h2 className="text-xl font-bold text-white">Sell to Verified Campus Students</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose between fixed price, interactive bargaining, or live auction with automatic escrow.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Category & Listing Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Listing Type</label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="negotiable">Negotiable (Students can counter-offer)</option>
                <option value="fixed">Fixed Price (Instant Buy)</option>
                <option value="auction">Live Auction (Timed bidding with countdown)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Apple MacBook Air M1 (8GB / 256GB SSD) Space Grey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Condition Notes</label>
            <textarea
              rows="3"
              placeholder="Describe condition, battery health, original accessories included..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Price, Minimum Price & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {listingType === 'auction' ? 'Starting Price (₹)' : 'Asking Price (₹)'}
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="₹"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Private Reserve (₹)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Hidden from buyers"
                value={minimumPrice}
                onChange={(e) => setMinimumPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Only visible to you</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          {/* If Auction: End Time */}
          {listingType === 'auction' && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <label className="block text-xs font-bold text-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Auction Closes At
              </label>
              <input
                type="datetime-local"
                required
                value={auctionEndTime}
                onChange={(e) => setAuctionEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Dynamic Category Specifications */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {category} Specifications (Helps ML Recommender & Filter Accuracy)
            </span>

            {category === 'Laptops' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">RAM</label>
                  <input
                    type="text"
                    value={laptopRam}
                    onChange={(e) => setLaptopRam(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Storage</label>
                  <input
                    type="text"
                    value={laptopStorage}
                    onChange={(e) => setLaptopStorage(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Processor</label>
                  <input
                    type="text"
                    value={laptopProcessor}
                    onChange={(e) => setLaptopProcessor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            )}

            {category === 'Books' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Author</label>
                  <input
                    type="text"
                    placeholder="e.g. Cormen / HC Verma"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Edition</label>
                  <input
                    type="text"
                    placeholder="e.g. 3rd Edition"
                    value={bookEdition}
                    onChange={(e) => setBookEdition(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            )}

            {category === 'Cycles' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Gear System</label>
                <input
                  type="text"
                  placeholder="e.g. Shimano 21S / Single Speed"
                  value={cycleGears}
                  onChange={(e) => setCycleGears(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            )}

            {category === 'Shoes' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Shoe Size</label>
                <input
                  type="text"
                  placeholder="e.g. UK 9 / US 10"
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            )}

            {category === 'Tickets' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Event Date / Details</label>
                <input
                  type="text"
                  placeholder="e.g. March 28, 2026 - Campus Fest Main Stage"
                  value={ticketDate}
                  onChange={(e) => setTicketDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product Photo</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-indigo-400 flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploadingImage ? 'Uploading...' : 'Upload Image File'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>

              <span className="text-xs text-slate-500">or paste image URL:</span>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {imageUrl && (
              <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Handover Location</label>
            <input
              type="text"
              placeholder="e.g. Central Library / Block 34 Canteen"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
            >
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

