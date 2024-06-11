import { Pinecone } from '@pinecone-database/pinecone';

export const getPineconeClient = async () => {
  const client = new Pinecone({
    apiKey: '144a82de-339e-413d-b5b5-42034a0682c2',
  })

  try {
    console.log('Initializing Pinecone client...')
    return client
  } catch (error) {
    console.error('Error initializing Pinecone client:', error)
    throw new Error('Failed to initialize Pinecone client')
  }
}
