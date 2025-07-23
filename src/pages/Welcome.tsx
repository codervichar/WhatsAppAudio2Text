import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, ArrowRight } from 'lucide-react'

const Welcome: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>Welcome to WhatsApp2Text</title>
        <meta name="description" content="Welcome to WhatsApp2Text. Your account is now active." />
      </Helmet>
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Welcome to WhatsApp2Text!</h1>
        <p className="text-xl mb-8">Your account has been successfully created and your subscription is now active.</p>
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Next Steps</h2>
          <ol className="text-left list-decimal list-inside space-y-2">
            <li>Add our WhatsApp number to your contacts</li>
            <li>Send your first audio message to start transcribing</li>
            <li>Check your dashboard to view your transcriptions</li>
          </ol>
        </div>
        <Link to="/dashboard" className="inline-flex items-center bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition duration-300">
          Go to Dashboard <ArrowRight className="ml-2" />
        </Link>
      </div>
    </div>
  )
}

export default Welcome