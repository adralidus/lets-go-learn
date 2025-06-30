import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, FileText, Award, Send, ArrowRight } from 'lucide-react';
import { supabase, createSystemNotification } from '../lib/supabase';

export function LandingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Get super admin ID to send notification to
      const { data: superAdmins, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1);
      
      if (adminError) throw adminError;
      
      if (!superAdmins || superAdmins.length === 0) {
        throw new Error('No super admin found to receive the inquiry');
      }
      
      const superAdminId = superAdmins[0].id;
      
      // Create system notification
      await createSystemNotification(
        `New Inquiry: ${formData.subject}`,
        `Email: ${formData.email}\n\nMessage: ${formData.message}`,
        'info',
        undefined,
        superAdminId,
        false
      );
      
      setSuccess(true);
      setFormData({ email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setError('Failed to submit your inquiry. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-2">
                <h1 className="text-2xl font-bold text-blue-600">LetsGoLearn</h1>
                <p className="text-xs text-gray-500">LGL Learning Management System</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>Login</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Empower Learning with LetsGoLearn</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              A comprehensive learning management system designed for educational institutions, instructors, and students.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors text-lg font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Platform Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Examination Management</h3>
              </div>
              <p className="text-gray-600">
                Create, manage, and grade examinations with multiple question types including multiple choice and essay questions.
              </p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Student Management</h3>
              </div>
              <p className="text-gray-600">
                Easily manage student accounts, track progress, and provide personalized feedback on their performance.
              </p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Performance Analytics</h3>
              </div>
              <p className="text-gray-600">
                Comprehensive analytics and reporting tools to track student performance, identify trends, and improve educational outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose LetsGoLearn?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">For Instructors</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-blue-600">✓</div>
                  <span className="ml-2 text-gray-600">Streamlined exam creation and grading</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-blue-600">✓</div>
                  <span className="ml-2 text-gray-600">Detailed student performance insights</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-blue-600">✓</div>
                  <span className="ml-2 text-gray-600">Organize exams with folders and categories</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-blue-600">✓</div>
                  <span className="ml-2 text-gray-600">Automated grading for multiple choice questions</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">For Students</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-600">✓</div>
                  <span className="ml-2 text-gray-600">Intuitive exam-taking interface</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-600">✓</div>
                  <span className="ml-2 text-gray-600">Immediate feedback on multiple choice questions</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-600">✓</div>
                  <span className="ml-2 text-gray-600">Track progress and performance over time</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-600">✓</div>
                  <span className="ml-2 text-gray-600">Access to past exam results and feedback</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Contact Us for Inquiry</h2>
          
          {success ? (
            <div className="bg-green-100 border border-green-200 text-green-700 px-6 py-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
              <p className="mb-4">Your inquiry has been submitted successfully. Our team will get back to you soon.</p>
              <button
                onClick={() => setSuccess(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Inquiry about LetsGoLearn"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide details about your inquiry..."
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Inquiry</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <BookOpen className="h-6 w-6 text-blue-400" />
              <div className="ml-2">
                <h3 className="text-xl font-bold text-white">LetsGoLearn</h3>
                <p className="text-xs text-gray-400">© 2025 LGL Learning Management System</p>
              </div>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}