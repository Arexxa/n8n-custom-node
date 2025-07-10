// src/oauth2/test-client.ts
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000';
const CLIENT_ID = process.env.OAUTH2_CLIENT_ID || 'shoplink-client';
const CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;

async function testOAuth2Flow() {
    try {
        console.log('🚀 Starting OAuth2 Test Flow...\n');
        
        // Step 1: Get access token using client_credentials
        console.log('Step 1: Getting access token...');
        const tokenResponse = await axios.post(`${BASE_URL}/oauth/token`, {
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: 'customer:read customer:write'
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            transformRequest: [(data) => {
                return Object.keys(data)
                    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                    .join('&');
            }]
        });
        
        console.log('✅ Token Response:', tokenResponse.data);
        const accessToken = tokenResponse.data.access_token;
        
        // Step 2: Validate the token
        console.log('\nStep 2: Validating token...');
        const validateResponse = await axios.get(`${BASE_URL}/oauth/validate`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        console.log('✅ Token Validation:', validateResponse.data);
        
        // Step 3: Test API call with token
        console.log('\nStep 3: Testing API call...');
        const apiResponse = await axios.get(`${BASE_URL}/api/crm/appcustomers/demo`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        console.log('✅ API Response Status:', apiResponse.status);
        console.log('API Response Data:', apiResponse.data);
        
    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

// Run the test
if (require.main === module) {
    testOAuth2Flow();
}