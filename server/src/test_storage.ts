
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
    console.log('Testing Supabase Storage Connection...');
    console.log('URL:', supabaseUrl);

    // 1. List Buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('❌ Error listing buckets:', listError.message);
        return;
    }

    console.log('✅ Buckets found:', buckets.map(b => b.name));

    const bucketName = 'stock-images';
    const bucket = buckets.find(b => b.name === bucketName);

    if (!bucket) {
        console.error(`❌ Bucket '${bucketName}' NOT found. Please create it in Supabase Dashboard.`);
        return;
    }

    console.log(`✅ Bucket '${bucketName}' exists.`);
    console.log(`   Public: ${bucket.public}`);

    // 2. Try Upload
    console.log('Attempting test upload...');
    const fileName = `test-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, 'Test file content', {
            contentType: 'text/plain'
        });

    if (uploadError) {
        console.error('❌ Upload Failed:', uploadError.message);
        console.error('   Details:', uploadError);
        console.log('   Hint: Check RLS policies. You might need to allow INSERT for public/anon users.');
    } else {
        console.log('✅ Upload Successful:', uploadData);

        // Clean up
        await supabase.storage.from(bucketName).remove([fileName]);
        console.log('✅ Test file cleaned up.');
    }
}

testStorage();
