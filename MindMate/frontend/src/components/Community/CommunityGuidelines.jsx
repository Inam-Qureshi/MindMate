import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Heart, 
  Users, 
  MessageCircle, 
  ThumbsUp, 
  Flag, 
  AlertCircle, 
  CheckCircle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Target, 
  Award, 
  Star, 
  Zap, 
  Eye, 
  Lock, 
  Unlock,
  HelpCircle,
  Info
} from 'react-feather';

const CommunityGuidelines = ({ 
  guidelines, 
  darkMode 
}) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const guidelineSections = [
    {
      id: 'welcome',
      title: 'Welcome to Our Community',
      icon: <Heart size={20} />,
      color: 'text-green-600 bg-green-100',
      colorDark: 'text-green-400 bg-green-900',
      content: [
        {
          title: 'Our Mission',
          description: 'We are a supportive community dedicated to mental health and wellness. Our goal is to create a safe space where everyone can share, learn, and grow together.',
          points: [
            'Foster a supportive and inclusive environment',
            'Promote mental health awareness and education',
            'Provide resources and tools for wellness',
            'Connect people with similar experiences'
          ]
        },
        {
          title: 'Community Values',
          description: 'These core values guide everything we do in our community:',
          points: [
            'Respect and empathy for all members',
            'Confidentiality and privacy protection',
            'Evidence-based information sharing',
            'Inclusive and non-judgmental communication'
          ]
        }
      ]
    },
    {
      id: 'posting',
      title: 'Posting Guidelines',
      icon: <MessageCircle size={20} />,
      color: 'text-blue-600 bg-blue-100',
      colorDark: 'text-blue-400 bg-blue-900',
      content: [
        {
          title: 'What to Post',
          description: 'Share content that is helpful, supportive, and relevant to mental health and wellness:',
          points: [
            'Personal experiences and insights',
            'Questions about mental health topics',
            'Resources and helpful information',
            'Supportive responses to others'
          ]
        },
        {
          title: 'What Not to Post',
          description: 'Please avoid content that could be harmful or inappropriate:',
          points: [
            'Medical advice or diagnosis',
            'Harmful or dangerous content',
            'Spam or promotional material',
            'Personal attacks or harassment'
          ]
        }
      ]
    },
    {
      id: 'interaction',
      title: 'Interaction Guidelines',
      icon: <Users size={20} />,
      color: 'text-purple-600 bg-purple-100',
      colorDark: 'text-purple-400 bg-purple-900',
      content: [
        {
          title: 'Respectful Communication',
          description: 'Always communicate with respect and empathy:',
          points: [
            'Use kind and supportive language',
            'Listen to others with an open mind',
            'Avoid judgmental or critical comments',
            'Be patient and understanding'
          ]
        },
        {
          title: 'Privacy and Confidentiality',
          description: 'Protect your privacy and respect others\' confidentiality:',
          points: [
            'Don\'t share personal identifying information',
            'Respect others\' privacy and boundaries',
            'Use anonymous posting when appropriate',
            'Report privacy violations immediately'
          ]
        }
      ]
    },
    {
      id: 'moderation',
      title: 'Moderation and Safety',
      icon: <Shield size={20} />,
      color: 'text-red-600 bg-red-100',
      colorDark: 'text-red-400 bg-red-900',
      content: [
        {
          title: 'Community Moderation',
          description: 'Our moderators work to maintain a safe and supportive environment:',
          points: [
            'Review reported content promptly',
            'Enforce community guidelines fairly',
            'Provide warnings before taking action',
            'Support members in need of help'
          ]
        },
        {
          title: 'Reporting Concerns',
          description: 'If you see something concerning, please report it:',
          points: [
            'Use the report button on inappropriate content',
            'Contact moderators directly for urgent issues',
            'Provide specific details when reporting',
            'Follow up on reported issues when possible'
          ]
        }
      ]
    },
    {
      id: 'resources',
      title: 'Resources and Support',
      icon: <BookOpen size={20} />,
      color: 'text-orange-600 bg-orange-100',
      colorDark: 'text-orange-400 bg-orange-900',
      content: [
        {
          title: 'Available Resources',
          description: 'We provide various resources to support your mental health journey:',
          points: [
            'Professional mental health resources',
            'Self-help tools and techniques',
            'Community support groups',
            'Crisis intervention resources'
          ]
        },
        {
          title: 'Getting Help',
          description: 'If you need immediate help or are in crisis:',
          points: [
            'Contact emergency services (911)',
            'Use crisis hotlines and chat services',
            'Reach out to mental health professionals',
            'Connect with trusted friends or family'
          ]
        }
      ]
    }
  ];

  const handleSectionToggle = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const filteredSections = guidelineSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.some(content =>
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className={`community-guidelines ${darkMode ? 'dark' : ''}`}>
      <div className="guidelines-container">
        {/* Guidelines Header */}
        <div className="guidelines-header">
          <div className="header-content">
            <Shield size={24} />
            <h2>Community Guidelines</h2>
            <p>Rules and guidelines to ensure a safe and supportive community</p>
          </div>
        </div>

        {/* Search and Navigation */}
        <div className="guidelines-navigation">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search guidelines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
          <div className="quick-links">
            <h3>Quick Links</h3>
            <div className="links-list">
              {guidelineSections.map(section => (
                <button
                  key={section.id}
                  className="quick-link"
                  onClick={() => setExpandedSection(section.id)}
                >
                  {section.icon}
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guidelines Content */}
        <div className="guidelines-content">
          {filteredSections.map((section, sectionIndex) => (
            <motion.div
              key={section.id}
              className="guideline-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
            >
              <div 
                className="section-header"
                onClick={() => handleSectionToggle(section.id)}
              >
                <div className="section-icon">
                  <div className={`icon-wrapper ${darkMode ? section.colorDark : section.color}`}>
                    {section.icon}
                  </div>
                </div>
                
                <div className="section-title">
                  <h3>{section.title}</h3>
                </div>
                
                <div className="section-toggle">
                  {expandedSection === section.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedSection === section.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="section-content"
                  >
                    {(section.content || []).map((content, contentIndex) => (
                      <div key={contentIndex} className="content-item">
                        <div className="content-header">
                          <h4>{content.title}</h4>
                        </div>
                        
                        <div className="content-description">
                          <p>{content.description}</p>
                        </div>
                        
                        <div className="content-points">
                          <ul>
                            {(content.points || []).map((point, pointIndex) => (
                              <li key={pointIndex}>
                                <CheckCircle size={16} />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Guidelines Footer */}
        <div className="guidelines-footer">
          <div className="footer-content">
            <div className="footer-info">
              <Info size={20} />
              <div className="info-content">
                <h3>Need Help?</h3>
                <p>If you have questions about these guidelines or need clarification, please contact our moderators.</p>
              </div>
            </div>
            
            <div className="footer-actions">
              <button className="action-btn primary">
                <MessageCircle size={16} />
                <span>Contact Moderators</span>
              </button>
              
              <button className="action-btn secondary">
                <HelpCircle size={16} />
                <span>Get Help</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityGuidelines;
