'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  userStatus: 'unverified' | 'pending' | 'verified'
  onStatusChange: (status: 'unverified' | 'pending' | 'verified') => void
}

export default function VerificationModal({ isOpen, onClose, userStatus, onStatusChange }: VerificationModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    id_type: '',
    id_document_url: ''
  })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClientComponentClient()

  const idTypes = [
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'voters_id', label: "Voter's ID" },
    { value: 'postal_id', label: 'Postal ID' },
    { value: 'philhealth_id', label: 'PhilHealth ID' },
    { value: 'student_id', label: 'Student ID (Current Academic Year Only)' }
  ]

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and PDF files are allowed')
      return
    }

    setUploadingFile(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `verification-documents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, id_document_url: publicUrl }))
    } catch (error: any) {
      setError(error.message || 'Error uploading file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/user-verification-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'submit_verification',
          ...formData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Verification submission failed')
      }

      onStatusChange('pending')
      onClose()
      alert('Verification request submitted successfully! You will be notified once reviewed.')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  if (userStatus === 'pending') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-time-line text-2xl text-yellow-600"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Verification Pending</h3>
            <p className="text-gray-600 mb-6">
              Your verification request is being reviewed. You'll be notified once approved.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg w-full"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (userStatus === 'verified') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Account Verified</h3>
            <p className="text-gray-600 mb-6">
              Your account is verified! Enjoy all features including promos, rewards, and priority rides.
            </p>
            <button
              onClick={onClose}
              className="bg-green-500 text-white px-6 py-2 rounded-lg w-full"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Verify Your Account</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${step >= 1 ? 'text-blue-500' : 'text-gray-400'}`}>
              Personal Info
            </span>
            <span className={`text-sm ${step >= 2 ? 'text-blue-500' : 'text-gray-400'}`}>
              ID Upload
            </span>
            <span className={`text-sm ${step >= 3 ? 'text-blue-500' : 'text-gray-400'}`}>
              Review
            </span>
          </div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              3
            </div>
          </div>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+639XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complete Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter your complete address"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formData.full_name || !formData.email || !formData.phone || !formData.address}
                className="w-full bg-blue-500 text-white py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 2: ID Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Type *
                </label>
                <select
                  value={formData.id_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select ID Type</option>
                  {idTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload ID Document *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {formData.id_document_url ? (
                    <div className="space-y-2">
                      <i className="ri-file-check-line text-3xl text-green-500"></i>
                      <p className="text-sm text-green-600">Document uploaded successfully</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <i className="ri-upload-2-line text-3xl text-gray-400"></i>
                      <p className="text-sm text-gray-600">
                        {uploadingFile ? 'Uploading...' : 'Click to upload your ID'}
                      </p>
                      <p className="text-xs text-gray-500">JPG, PNG, PDF • Max 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.id_type || !formData.id_document_url || uploadingFile}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Review Your Information</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{formData.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium">{formData.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID Type:</span>
                    <p className="font-medium">
                      {idTypes.find(t => t.value === formData.id_type)?.label}
                    </p>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-500 text-sm">Address:</span>
                  <p className="font-medium text-sm">{formData.address}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">What happens next?</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Your request will be reviewed within 24-48 hours</li>
                  <li>• You'll receive a notification once approved</li>
                  <li>• Verified users get access to promos, rewards, and priority rides</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg disabled:bg-blue-300"
                >
                  {loading ? 'Submitting...' : 'Submit Verification'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
