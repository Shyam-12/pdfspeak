import { db } from '@/db';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from '@pinecone-database/pinecone';
import { PLANS } from '@/config/stripe';

const f = createUploadthing();

const middleware = async () => {
  const { getUser } = getKindeServerSession();
  const user = getUser();

  if (!user || !user.id) {
    throw new Error('Unauthorized');
  }

  console.log("User found");

  console.log("User returned");
  return { userId: user.id };
};

const onUploadComplete = async ({
  metadata,
  file,
}: {
  metadata: Awaited<ReturnType<typeof middleware>>;
  file: {
    key: string;
    name: string;
    url: string;
  };
}) => {
  console.log("Inside onUploadComplete");
  const isFileExist = await db.file.findFirst({
    where: {
      key: file.key,
    },
  });

  if (isFileExist) {
    return;
  }

  console.log("File does not exist, uploading new to upload thing");
  const createdFile = await db.file.create({
    data: {
      key: file.key,
      name: file.name,
      userId: metadata.userId,
      url: `https://utfs.io/f/${file.key}`,
      uploadStatus: 'PROCESSING',
    },
  });

  console.log("File uploaded to upload thing", createdFile.id);

  try {
    const response = await fetch(`https://utfs.io/f/${file.key}`);
    const blob = await response.blob();

    console.log("Blob created", blob)

    const loader = new PDFLoader(blob);

    console.log("Loader created", loader)
    const pageLevelDocs = await loader.load();
    const pagesAmt = pageLevelDocs.length;

    const isFreeExceeded = pagesAmt > PLANS.find(plan => plan.name === 'Free')!.pagesPerPdf;

    if (isFreeExceeded) {
      await db.file.update({
        data: {
          uploadStatus: 'FAILED',
        },
        where: {
          id: createdFile.id,
        },
      });
      return;
    }

    // Create a new index for this PDF
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = client.Index('pdfspeak');

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    console.log("Embeddings created", embeddings)

    console.log("Page level docs", pageLevelDocs)

    console.log("created file id", createdFile.id);
    await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
      pineconeIndex,
      namespace: `${createdFile.id}`,
    });

    await db.file.update({
      data: {
        uploadStatus: 'SUCCESS',
      },
      where: {
        id: createdFile.id,
      },
    });
  } catch (error) {
    await db.file.update({
      data: {
        uploadStatus: 'FAILED',
      },
      where: {
        id: createdFile.id,
      },
    });
  }
};

export const ourFileRouter = {
  freePlanUploader: f({ pdf: { maxFileSize: '128MB' } })
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
  proPlanUploader: f({ pdf: { maxFileSize: '512MB' } })
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;