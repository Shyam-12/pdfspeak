import { PineconeClient } from '@pinecone-database/pinecone'
require('dotenv').config()

const testPineconeClient = async () => {
  const client = new PineconeClient()

  try {
    await client.init({
      apiKey: '83fa15dc-8407-4cbc-9c4e-633c8cff534d',
      environment: 'us-east-1',
    })

    console.log('Pinecone client initialized successfully')
  } catch (error) {
    console.error('Error initializing Pinecone client:', error)
  }
}

testPineconeClient()
