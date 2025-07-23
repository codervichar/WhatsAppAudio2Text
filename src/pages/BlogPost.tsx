import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  // This is a mock-up. In a real application, you'd fetch the blog post data based on the ID.
  const post = {
    title: "The Benefits of Audio-to-Text Conversion",
    date: "2023-05-15",
    content: "Audio-to-text conversion offers numerous benefits in today's fast-paced digital world. It allows for quick and easy transcription of voice messages, improving accessibility and searchability of audio content. This technology is particularly useful for professionals who need to review long audio files, students who want to convert lecture recordings into study notes, and individuals with hearing impairments who rely on text-based communication. With WhatsApp2Text, you can harness these benefits directly from your WhatsApp conversations, streamlining your communication and boosting productivity."
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>{post.title} - WhatsApp2Text Blog</title>
        <meta name="description" content={post.content.substring(0, 160)} />
      </Helmet>
      <Link to="/blog" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Back to Blog</Link>
      <article className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">{post.title}</h1>
        <p className="text-gray-600 mb-4 text-sm">{post.date}</p>
        <div className="prose max-w-none">
          <p className="text-base sm:text-lg">{post.content}</p>
        </div>
      </article>
    </div>
  )
}

export default BlogPost