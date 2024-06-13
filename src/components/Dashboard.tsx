'use client'

import { trpc } from '@/app/_trpc/client'
import UploadButton from './UploadButton'
import {
  Ghost,
  Loader2,
  MessageSquare,
  Plus,
  Trash,
} from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from './ui/button'
import { useState } from 'react'
import Image from 'next/image'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import { Toaster, toast } from 'react-hot-toast'

interface PageProps {
  subscriptionPlan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>
}

const Dashboard = ({ subscriptionPlan }: PageProps) => {
  const [currentlyDeletingFile, setCurrentlyDeletingFile] =
    useState<string | null>(null)

  const utils = trpc.useContext()

  const { data: files, isLoading } =
    trpc.getUserFiles.useQuery()

  const { mutate: deleteFile } =
    trpc.deleteFile.useMutation({
      onSuccess: () => {
        utils.getUserFiles.invalidate()
      },
      onMutate({ id }) {
        setCurrentlyDeletingFile(id)
      },
      onSettled() {
        setCurrentlyDeletingFile(null)
      },
    })

  const handleShare = async (fileId: any) => {
    const fileUrl = `http://localhost:3000/dashboard/${fileId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Share File Link',
          text: 'Check out this file!',
          url: fileUrl// Replace with your actual file URL
        });
      } else {
        throw new Error('Web Share API is not supported in this browser.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        const tempInput = document.createElement('input');
        tempInput.value = fileUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        // Show a success message or perform any other UI feedback
        toast.success('File link copied to clipboard!')
      } catch (clipboardError) {
        console.error('Error copying link to clipboard:', clipboardError);
        // Handle any errors from clipboard copying
        toast.error('Failed to copy file link to clipboard. Please copy it manually.')
      }
    }
  };



  return (
    <main className='mx-auto max-w-7xl md:p-10'>
      <Toaster/>
      <div className='mt-8 flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:gap-0'>
        <h1 className='mb-3 font-bold text-5xl text-gray-900'>
          My Files
        </h1>

        <UploadButton isSubscribed={subscriptionPlan.isSubscribed} />
      </div>

      {/* display all user files */}
      {files && files?.length !== 0 ? (
        <ul className='mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3'>
          {files
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((file) => (
              <li
                key={file.id}
                className='col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg'>
                <Link
                  href={`/dashboard/${file.id}`}
                  className='flex flex-col gap-2'>
                  <div className='pt-6 px-6 flex w-full items-center justify-between space-x-6'>
                    <div className='h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500' />
                    <div className='flex-1 truncate'>
                      <div className='flex items-center space-x-3'>
                        <h3 className='truncate text-lg font-medium text-zinc-900'>
                          {file.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className='px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500'>
                  <div className='flex items-center gap-2'>
                    <Plus className='h-4 w-4' />
                    {format(
                      new Date(file.createdAt),
                      'MMM yyyy'
                    )}
                  </div>

                  <div className='flex items-center gap-2'>
                    <MessageSquare className='h-4 w-4' />
                    mocked
                  </div>

                  <div className="flex gap-5">
                    <Button
                      onClick={() =>
                        deleteFile({ id: file.id })
                      }
                      size='sm'
                      className='w-full'
                      variant='destructive'>
                      {currentlyDeletingFile === file.id ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Trash className='h-4 w-4' />
                      )}
                    </Button>
                    <Button
                      onClick={() => handleShare(file.id)}
                      size='sm'
                      className='w-full'
                      variant='destructive'>
                      <Image src="/share.png" alt='' width={10} height={10} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      ) : isLoading ? (
        <Skeleton height={100} className='my-2' count={3} />
      ) : (
        <div className='mt-16 flex flex-col items-center gap-2'>
          <Ghost className='h-8 w-8 text-zinc-800' />
          <h3 className='font-semibold text-xl'>
            Pretty empty around here
          </h3>
          <p>Let&apos;s upload your first PDF.</p>
        </div>
      )}
    </main>
  )
}

export default Dashboard
