import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const BlogList: React.FC = () => {
  const blogPosts = [
    { id: 1, title: "The Benefits of Audio-to-Text Conversion", date: "2023-05-15" },
    { id: 2, title: "How WhatsApp2Text Improves Productivity", date: "2023-05-20" },
    { id: 3, title: "Understanding Speech Recognition Technology", date: "2023-05-25" },
  ]

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>Blog - WhatsApp2Text</title>
        <meta name="description" content="Read our latest articles about audio-to-text conversion and productivity tips." />
      </Helmet>
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">WhatsApp2Text Blog</h1>
      <div className="space-y-4 sm:space-y-6">
        {blogPosts.map((post) => (
          <div key={post.id} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-lg sm:text-xl font-semibold mb-2">
              <Link to={`/blog/${post.id}`} className="text-blue-600 hover:text-blue-800">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 text-sm">{post.date}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BlogList