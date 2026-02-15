const mongoose = require('mongoose');
const User = require('./src/models/User');

async function test() {
    await mongoose.connect('mongodb://localhost:27017/chess_analytics');
    console.log('Connected to chess_analytics');

    const query = 'karan';
    const allMatches = await User.find({
        username: { $regex: query, $options: 'i' }
    }).select('username _id');

    console.log('Search for "karan" matches:', allMatches.map(u => ({ username: u.username, id: u._id })));

    const exactKaran2 = await User.findOne({ username: 'karan2' });
    console.log('Exact lookup for "karan2":', exactKaran2 ? 'Found' : 'Not Found');

    const allUsersCount = await User.countDocuments({});
    console.log('Total users in collection:', allUsersCount);

    await mongoose.disconnect();
}

test().catch(console.error);
