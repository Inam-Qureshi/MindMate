import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Phone, Calendar, Upload, FileText, Award, Briefcase, 
  DollarSign, Clock, Globe, CheckCircle, AlertCircle, Sun, Moon,
  ArrowRight, ArrowLeft, Save, Camera
} from "react-feather";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";
import { ProfileDraftStorage, AuthStorage, PreferencesStorage } from "../../utils/localStorage";

const SpecialistCompleteProfileNew = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [completedSections, setCompletedSections] = useState(() => {
    return ProfileDraftStorage.getCompletedSections();
  });
  const [userInfo, setUserInfo] = useState({
    name: AuthStorage.getFullName() || "",
    email: PreferencesStorage.getEmail() || ""
  });
  
  // Form data with localStorage persistence
  const [formData, setFormData] = useState(() => {
    const saved = ProfileDraftStorage.getDraft();
    if (saved && Object.keys(saved).length > 0) {
      return saved;
    }
    return {
      // Core Identification
      phone_number: "",
      cnic_number: "",
      profile_photo_url: "",
      gender: "",
      date_of_birth: "",
    
    // Professional Credentials
    qualification: "",
    institution: "",
    license_number: "",
    license_authority: "",
    license_expiry_date: "",
    years_of_experience: "",
    specialization: [],
    certifications: [],
    languages_spoken: [],
    license_document_url: "",
    cnic_document_url: "",
    degree_document_url: "",
    certification_document_urls: [],
    supporting_document_urls: [],
    
    // Practice Details
    current_affiliation: "",
    clinic_address: "",
    consultation_modes: [],
    availability_schedule: {}, // Structure: { Mon: { online: { from: "08:00 AM", to: "05:00 PM" }, in_person: {...} } }
    weekly_schedule: null,
    consultation_fee: "",
    currency: "PKR",
    experience_summary: "",
    specialties_in_mental_health: [],
    therapy_methods: [],
    accepting_new_patients: true,
    };
  });

  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  // Initialize dark mode
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  // Fetch dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No access token found");
          toast.error("Please log in to continue");
          // Component is protected by route, but add safety check
          return;
        }

        const response = await axios.get(`${API_URL}${API_ENDPOINTS.SPECIALISTS.DROPDOWN_OPTIONS}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDropdownOptions(response.data);
      } catch (error) {
        console.error("Failed to fetch options:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error("Session expired. Please log in again.");
          // ProtectedRoute should handle redirect, but add safety
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        } else {
          toast.error("Failed to load form options. Please refresh the page.");
        }
      }
    };
    fetchOptions();
  }, []);

  // Auto-save formData to localStorage only (no backend sync to avoid spam)
  useEffect(() => {
    // Save to localStorage immediately for offline access
    ProfileDraftStorage.setDraft(formData);
    setLastSaved(new Date());
    // Removed backend auto-sync to prevent endpoint spam - use complete-profile endpoint only
  }, [formData]);

  // Save completed sections
  useEffect(() => {
    ProfileDraftStorage.setCompletedSections(completedSections);
  }, [completedSections]);

  // Track if we've already fetched specialist data
  const specialistDataFetchedRef = React.useRef(false);

  // Load localStorage data immediately on mount (before API call)
  useEffect(() => {
    // Load saved draft from localStorage first to prevent profile disappearing on refresh
    const savedDraft = ProfileDraftStorage.getDraft();
    if (savedDraft && Object.keys(savedDraft).length > 0) {
      setFormData(savedDraft);
    }
    
    // Load user info from localStorage
    const storedName = localStorage.getItem("full_name");
    const storedEmail = localStorage.getItem("email");
    if (storedName) {
      setUserInfo(prev => ({ ...prev, name: storedName }));
    }
    if (storedEmail) {
      setUserInfo(prev => ({ ...prev, email: storedEmail }));
    }
    
    // Check for saved profile photo in localStorage
    if (savedDraft?.profile_photo_url) {
      setProfilePicturePreview(savedDraft.profile_photo_url);
    }
  }, []); // Run once on mount

  // Fetch existing specialist data from backend (only once on mount)
  useEffect(() => {
    // Skip if already fetched
    if (specialistDataFetchedRef.current) {
      return;
    }

    const fetchSpecialistData = async () => {
      // Get data from localStorage as fallback
      const storedName = localStorage.getItem("full_name");
      const storedEmail = localStorage.getItem("email");
      const storedSpecialistType = localStorage.getItem("specialist_type");
      
      if (storedName) {
        setUserInfo(prev => ({ ...prev, name: storedName }));
      }
      if (storedEmail) {
        setUserInfo(prev => ({ ...prev, email: storedEmail }));
      }
      
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          // No token - use localStorage data only
          return;
        }
        
        // Mark as fetching before API call
        specialistDataFetchedRef.current = true;

        const response = await axios.get(`${API_URL}${API_ENDPOINTS.SPECIALISTS.PRIVATE_PROFILE}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          const profile = response.data;
          
          // Update user info (name, email)
          if (profile.first_name || profile.last_name) {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            if (fullName) setUserInfo(prev => ({ ...prev, name: fullName }));
          }
          if (profile.email) {
            setUserInfo(prev => ({ ...prev, email: profile.email }));
          }
          
          // Pre-fill form with existing data
          const updates = {};
          
          if (profile.phone_number) updates.phone_number = profile.phone_number;
          if (profile.profile_photo_url) {
            updates.profile_photo_url = profile.profile_photo_url;
            setProfilePicturePreview(profile.profile_photo_url);
          }
          if (profile.gender) updates.gender = profile.gender;
          if (profile.date_of_birth) updates.date_of_birth = profile.date_of_birth;
          if (profile.qualification) updates.qualification = profile.qualification;
          if (profile.institution) updates.institution = profile.institution;
          if (profile.license_number) updates.license_number = profile.license_number;
          if (profile.license_authority) updates.license_authority = profile.license_authority;
          if (profile.license_expiry_date) updates.license_expiry_date = profile.license_expiry_date;
          if (profile.years_of_experience) updates.years_of_experience = profile.years_of_experience;
          if (profile.current_affiliation) updates.current_affiliation = profile.current_affiliation;
          if (profile.clinic_address) updates.clinic_address = profile.clinic_address;
          if (profile.consultation_fee) updates.consultation_fee = profile.consultation_fee;
          if (profile.currency) updates.currency = profile.currency;
          if (profile.experience_summary) updates.experience_summary = profile.experience_summary;
          
          if (profile.specialization && profile.specialization.length > 0) {
            updates.specialization = profile.specialization;
          }
          if (profile.languages_spoken && profile.languages_spoken.length > 0) {
            updates.languages_spoken = profile.languages_spoken;
          }
          if (profile.certifications && profile.certifications.length > 0) {
            updates.certifications = profile.certifications;
          }
          if (profile.consultation_modes && profile.consultation_modes.length > 0) {
            updates.consultation_modes = profile.consultation_modes;
          }
          if (profile.specialties_in_mental_health && profile.specialties_in_mental_health.length > 0) {
            updates.specialties_in_mental_health = profile.specialties_in_mental_health;
          }
          if (profile.therapy_methods && profile.therapy_methods.length > 0) {
            updates.therapy_methods = profile.therapy_methods;
          }
          if (profile.availability_schedule) {
            // Parse backend format (time ranges) to dropdown format
            const schedule = profile.availability_schedule;
            const parsedSchedule = {};
            
            // Helper to convert 24-hour format to dropdown format (e.g., "09:00" to "09:00 AM")
            const formatToDropdown = (timeStr) => {
              const [hours, minutes] = timeStr.split(':');
              let hour = parseInt(hours);
              const period = hour >= 12 ? 'PM' : 'AM';
              
              if (hour > 12) hour -= 12;
              if (hour === 0) hour = 12;
              
              return `${hour.toString().padStart(2, '0')}:${minutes} ${period}`;
            };
            
            Object.keys(schedule).forEach(day => {
              const dayData = schedule[day];
              parsedSchedule[day] = {};
              
              // Parse online time range (e.g., "09:00-17:00")
              if (dayData.online && typeof dayData.online === 'string') {
                const [from, to] = dayData.online.split('-');
                if (from && to) {
                  parsedSchedule[day].online = {
                    from: formatToDropdown(from),
                    to: formatToDropdown(to)
                  };
                }
              }
              
              // Parse in_person time range
              if (dayData.in_person && typeof dayData.in_person === 'string') {
                const [from, to] = dayData.in_person.split('-');
                if (from && to) {
                  parsedSchedule[day].in_person = {
                    from: formatToDropdown(from),
                    to: formatToDropdown(to)
                  };
                }
              }
            });
            
            updates.availability_schedule = parsedSchedule;
          }
          if (profile.accepting_new_patients !== undefined) {
            updates.accepting_new_patients = profile.accepting_new_patients;
          }
          if (profile.license_document_url) {
            updates.license_document_url = profile.license_document_url;
          }
          if (profile.cnic_document_url) {
            updates.cnic_document_url = profile.cnic_document_url;
          }
          
          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
            toast.success("Profile data loaded!", { duration: 2000 });
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        // Reset ref on error to allow retry if needed
        specialistDataFetchedRef.current = false;
        // Fallback to localStorage
        const storedSpecialistType = localStorage.getItem("specialist_type");
        if (storedSpecialistType && formData.specialization.length === 0) {
          setFormData(prev => ({ ...prev, specialization: [storedSpecialistType] }));
        }
      }
    };
    
    fetchSpecialistData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = type === 'checkbox' ? checked : value;
    
    // Auto-format phone number for Pakistani format
    if (name === 'phone_number') {
      // Remove all non-digits
      let digits = value.replace(/\D/g, '');
      
      // If starts with 92, add +
      if (digits.startsWith('92')) {
        processedValue = '+' + digits;
      }
      // If starts with 0, replace with +92
      else if (digits.startsWith('0')) {
        processedValue = '+92' + digits.substring(1);
      }
      // If just digits, add +92
      else if (digits.length > 0 && !digits.startsWith('92')) {
        processedValue = '+92' + digits;
      } else {
        processedValue = value;
      }
      
      // Limit to +92 and 10 digits (total 13 chars)
      if (processedValue.length > 13) {
        processedValue = processedValue.substring(0, 13);
      }
    }
    
    // Auto-format CNIC number (Pakistani format: 00000-0000000-0)
    if (name === 'cnic_number') {
      let digits = value.replace(/\D/g, '');
      if (digits.length <= 5) {
        processedValue = digits;
      } else if (digits.length <= 12) {
        processedValue = digits.substring(0, 5) + '-' + digits.substring(5);
      } else {
        processedValue = digits.substring(0, 5) + '-' + digits.substring(5, 12) + '-' + digits.substring(12, 13);
      }
      // Limit to 13 digits + 2 hyphens = 15 chars
      if (processedValue.length > 15) {
        processedValue = processedValue.substring(0, 15);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleMultiSelect = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(value)
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const handleArrayInput = (name, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [name]: array }));
  };


  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    const token = localStorage.getItem("access_token");
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('document_type', documentType);

    try {
      setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
      
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.UPLOAD_DOCUMENT}`,
        formDataUpload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [documentType]: percentCompleted }));
          }
        }
      );

      // Store the file URL based on document type
      const fileUrl = response.data.file_url;
      
      if (documentType === 'license') {
        setFormData(prev => ({ ...prev, license_document_url: fileUrl }));
      } else if (documentType === 'cnic') {
        setFormData(prev => ({ ...prev, cnic_document_url: fileUrl }));
      } else if (documentType === 'degree') {
        setFormData(prev => ({ ...prev, degree_document_url: fileUrl }));
      } else if (documentType === 'certification') {
        // Add to certification array
        setFormData(prev => ({ 
          ...prev, 
          certification_document_urls: [...(prev.certification_document_urls || []), fileUrl]
        }));
      } else if (documentType === 'supporting_document') {
        // Add to supporting documents array
        setFormData(prev => ({ 
          ...prev, 
          supporting_document_urls: [...(prev.supporting_document_urls || []), fileUrl]
        }));
      } else if (documentType === 'profile_photo') {
        setFormData(prev => ({ ...prev, profile_photo_url: fileUrl }));
      }
      
      // Set preview for profile photo
      if (documentType === 'profile_photo') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePicturePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
      
      // Show success message
      const uploadMessages = {
        license: "License document uploaded successfully!",
        cnic: "CNIC document uploaded successfully!",
        degree: "Degree document uploaded successfully!",
        certification: "Certification uploaded successfully!",
        supporting_document: "Supporting document uploaded successfully!",
        profile_photo: "Profile photo uploaded successfully!"
      };
      
      toast.success(uploadMessages[documentType] || "Document uploaded successfully!");
      setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));
    } catch (error) {
      console.error("Upload failed:", error);
      
      // Enhanced error handling for document uploads
      let errorMessage = `Failed to upload ${documentType}.`;
      
      if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail || '';
        
        if (status === 401 || status === 403) {
          errorMessage = 'Session expired. Please log in again.';
          setTimeout(() => navigate(ROUTES.LOGIN), 2000);
        } else if (status === 400) {
          if (detail.includes('size') || detail.includes('too large')) {
            errorMessage = `File is too large. Maximum size is 5MB.`;
          } else if (detail.includes('format') || detail.includes('type') || detail.includes('extension')) {
            errorMessage = `Invalid file format. Please upload PDF, JPG, JPEG, or PNG files only.`;
          } else if (detail.includes('required')) {
            errorMessage = `Please select a file to upload.`;
          } else {
            errorMessage = detail || errorMessage;
          }
        } else if (status === 413) {
          errorMessage = `File is too large. Maximum size is 5MB.`;
        } else if (status === 415) {
          errorMessage = `Unsupported file type. Please upload PDF, JPG, JPEG, or PNG files only.`;
        } else if (status >= 500) {
          errorMessage = `Server error. Please try again in a few moments.`;
        } else {
          errorMessage = detail || errorMessage;
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = `Upload timed out. Please try again with a smaller file.`;
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = `Network error. Please check your connection and try again.`;
      }
      
      toast.error(errorMessage, { duration: 6000 });
      setUploadProgress(prev => ({ ...prev, [documentType]: null }));
      
      // Set error state for the field
      const errorFieldMap = {
        license: 'license_document_url',
        cnic: 'cnic_document_url',
        degree: 'degree_document_url',
        certification: 'certification_document_urls',
        supporting_document: 'supporting_document_urls',
        profile_photo: 'profile_photo_url'
      };
      const errorField = errorFieldMap[documentType] || 'document_url';
      setErrors(prev => ({ ...prev, [errorField]: errorMessage }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.phone_number) {
        newErrors.phone_number = "Phone number is required";
      } else {
        // Validate Pakistani phone format: +92XXXXXXXXXX (13 chars total)
        const phoneRegex = /^\+92\d{10}$/;
        if (!phoneRegex.test(formData.phone_number)) {
          newErrors.phone_number = "Phone must be in format: +92XXXXXXXXXX (e.g., +923001234567)";
        }
      }
      
      if (!formData.gender) newErrors.gender = "Gender is required";
      
      if (!formData.date_of_birth) {
        newErrors.date_of_birth = "Date of birth is required";
      } else {
        const birthDate = new Date(formData.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 18) newErrors.date_of_birth = "You must be at least 18 years old";
        if (birthDate > today) newErrors.date_of_birth = "Date of birth cannot be in the future";
      }
    } else if (step === 2) {
      if (!formData.qualification) newErrors.qualification = "Qualification is required";
      if (!formData.institution) newErrors.institution = "Institution is required";
      if (!formData.license_number) newErrors.license_number = "License number is required";
      if (!formData.license_authority) newErrors.license_authority = "License authority is required";
      
      if (!formData.license_expiry_date) {
        newErrors.license_expiry_date = "License expiry date is required";
      } else {
        const expiryDate = new Date(formData.license_expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        if (expiryDate <= today) {
          newErrors.license_expiry_date = "License has expired. Please use a future date.";
        }
      }
      
      if (!formData.years_of_experience) newErrors.years_of_experience = "Years of experience is required";
      
      if (formData.specialization.length === 0) {
        newErrors.specialization = "Specialization is required. Please contact support if this field is empty.";
      }
      
      if (formData.languages_spoken.length === 0) newErrors.languages_spoken = "At least one language is required";
      if (!formData.license_document_url) newErrors.license_document_url = "License document is required";
      if (!formData.cnic_document_url) newErrors.cnic_document_url = "CNIC document is required";
      if (!formData.degree_document_url) newErrors.degree_document_url = "Degree document is required";
    } else if (step === 3) {
      if (!formData.current_affiliation || formData.current_affiliation.trim().length < 2) {
        newErrors.current_affiliation = "Current affiliation is required (minimum 2 characters)";
      }
      if (!formData.clinic_address || formData.clinic_address.trim().length < 10) {
        newErrors.clinic_address = "Clinic address is required (minimum 10 characters)";
      }
      if (formData.consultation_modes.length === 0) newErrors.consultation_modes = "At least one consultation mode is required";
      if (!formData.consultation_fee) newErrors.consultation_fee = "Consultation fee is required";
      
      // Validate availability_schedule - now optional, but if provided, must be valid
      const schedule = formData.availability_schedule || {};
      
      // Only validate if schedule is provided and not empty
      if (schedule && Object.keys(schedule).length > 0) {
        const validateTimeRange = (fromTime, toTime) => {
          if (!fromTime || !toTime) return false;
          
          // Convert time strings like "08:00 AM" to 24-hour format for comparison
          const parseTime = (timeStr) => {
            const [time, period] = timeStr.split(' ');
            const [hours, minutes] = time.split(':');
            let hour = parseInt(hours);
            
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            return hour * 60 + parseInt(minutes);
          };
          
          return parseTime(toTime) > parseTime(fromTime);
        };
        
        let timeRangeError = '';
        
        Object.keys(schedule).forEach(day => {
          const daySchedule = schedule[day];
          if (daySchedule && typeof daySchedule === 'object') {
            // Check online availability
            const online = daySchedule.online;
            if (online && online.from && online.to) {
              if (!validateTimeRange(online.from, online.to)) {
                timeRangeError = `Invalid time range for ${day} (Online): End time must be after start time.`;
              }
            }
            
            // Check in_person availability
            const inPerson = daySchedule.in_person;
            if (inPerson && inPerson.from && inPerson.to) {
              if (!validateTimeRange(inPerson.from, inPerson.to)) {
                timeRangeError = timeRangeError || `Invalid time range for ${day} (In-Person): End time must be after start time.`;
              }
            }
          }
        });
        
        if (timeRangeError) {
          newErrors.availability_schedule = timeRangeError;
        }
      }
      // If schedule is empty or not provided, it's valid (optional field)
      
      if (!formData.experience_summary || formData.experience_summary.trim().length < 50) {
        newErrors.experience_summary = "Professional summary is required (minimum 50 characters)";
      }
      if (formData.specialties_in_mental_health.length === 0 && formData.specialization.length === 0) {
        newErrors.specialties_in_mental_health = "At least one mental health specialty is required";
      }
      if (formData.therapy_methods.length === 0) {
        newErrors.therapy_methods = "At least one therapy method is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all steps before submission
    const step1Valid = validateStep(1);
    const step2Valid = validateStep(2);
    const step3Valid = validateStep(3);
    
    if (!step1Valid || !step2Valid || !step3Valid) {
      toast.error("Please complete all required fields before submitting.", { 
        duration: 5000,
        icon: '⚠️'
      });
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      
      // Transform formData to match backend expectations
      // Helper to convert empty strings to null for optional fields
      const toNullIfEmpty = (value) => (value && value.trim() !== '') ? value : null;
      
      const payload = {
        // Basic Information (all required)
        phone_number: formData.phone_number?.trim() || '',
        cnic_number: formData.cnic_number?.trim() || '',
        gender: formData.gender || '',
        date_of_birth: formData.date_of_birth || '',
        profile_photo_url: toNullIfEmpty(formData.profile_photo_url),
        
        // Professional Information (all required)
        qualification: formData.qualification?.trim() || '',
        institution: formData.institution?.trim() || '',
        years_of_experience: parseInt(formData.years_of_experience) || 0,
        current_affiliation: formData.current_affiliation?.trim() || '',
        clinic_address: formData.clinic_address?.trim() || '',
        
        // License Information (optional - convert empty strings to null)
        license_number: toNullIfEmpty(formData.license_number),
        license_authority: toNullIfEmpty(formData.license_authority),
        license_expiry_date: toNullIfEmpty(formData.license_expiry_date),
        
        // Practice Details (all required)
        consultation_modes: Array.isArray(formData.consultation_modes) && formData.consultation_modes.length > 0 
          ? formData.consultation_modes 
          : [],
        availability_schedule: (() => {
          // Transform availability_schedule from dropdown format to backend format
          const schedule = formData.availability_schedule || {};
          const cleanedSchedule = {};
          
          // Helper to convert time dropdown format to 24-hour format string
          const formatTimeToBackend = (timeStr) => {
            if (!timeStr) return '';
            // Convert "08:00 AM" to "08:00"
            const [time, period] = timeStr.split(' ');
            const [hours, minutes] = time.split(':');
            let hour = parseInt(hours);
            
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            return `${hour.toString().padStart(2, '0')}:${minutes}`;
          };
          
          // Helper to validate time range
          const isValidTimeRange = (fromTime, toTime) => {
            if (!fromTime || !toTime) return false;
            
            const parseTime = (timeStr) => {
              const [time, period] = timeStr.split(' ');
              const [hours, minutes] = time.split(':');
              let hour = parseInt(hours);
              
              if (period === 'PM' && hour !== 12) hour += 12;
              if (period === 'AM' && hour === 12) hour = 0;
              
              return hour * 60 + parseInt(minutes);
            };
            
            return parseTime(toTime) > parseTime(fromTime);
          };
          
          // Helper to create time range string
          const createTimeRange = (fromTime, toTime) => {
            const from = formatTimeToBackend(fromTime);
            const to = formatTimeToBackend(toTime);
            return `${from}-${to}`;
          };
          
          Object.keys(schedule).forEach(day => {
            const daySchedule = schedule[day];
            // Skip empty arrays or invalid data
            if (!daySchedule || Array.isArray(daySchedule) || typeof daySchedule !== 'object') {
              console.warn(`Skipping invalid day schedule for ${day}:`, daySchedule);
              return;
            }
            
            const dayData = {};
            let hasAnyAvailability = false;
            
            // Process online availability
            if (daySchedule.online && 
                typeof daySchedule.online === 'object' &&
                daySchedule.online.from && 
                daySchedule.online.to) {
              // Validate time range
              if (isValidTimeRange(daySchedule.online.from, daySchedule.online.to)) {
                dayData.online = createTimeRange(daySchedule.online.from, daySchedule.online.to);
                hasAnyAvailability = true;
              } else {
                console.warn(`Invalid time range for ${day} online: to time must be after from time`);
              }
            }
            
            // Process in_person availability
            if (daySchedule.in_person && 
                typeof daySchedule.in_person === 'object' &&
                daySchedule.in_person.from && 
                daySchedule.in_person.to) {
              // Validate time range
              if (isValidTimeRange(daySchedule.in_person.from, daySchedule.in_person.to)) {
                dayData.in_person = createTimeRange(daySchedule.in_person.from, daySchedule.in_person.to);
                hasAnyAvailability = true;
              } else {
                console.warn(`Invalid time range for ${day} in_person: to time must be after from time`);
              }
            }
            
            if (hasAnyAvailability) {
              cleanedSchedule[day] = dayData;
            }
          });
          
          return cleanedSchedule;
        })(),
        weekly_schedule: formData.weekly_schedule || null,
        consultation_fee: parseFloat(formData.consultation_fee) || 0,
        currency: formData.currency || "PKR",
        experience_summary: formData.experience_summary?.trim() || '',
        specialties_in_mental_health: formData.specialties_in_mental_health.length > 0 
          ? formData.specialties_in_mental_health 
          : (formData.specialization && formData.specialization.length > 0 ? formData.specialization : []),
        therapy_methods: Array.isArray(formData.therapy_methods) && formData.therapy_methods.length > 0
          ? formData.therapy_methods
          : [],
        accepting_new_patients: formData.accepting_new_patients !== undefined ? formData.accepting_new_patients : true,
        
        // Optional fields
        languages_spoken: Array.isArray(formData.languages_spoken) ? formData.languages_spoken : [],
        certifications: Array.isArray(formData.certifications) ? formData.certifications : [],
        
        // Document URLs (optional - convert empty strings to null)
        cnic_document_url: toNullIfEmpty(formData.cnic_document_url),
        degree_document_url: toNullIfEmpty(formData.degree_document_url),
        license_document_url: toNullIfEmpty(formData.license_document_url),
        certification_document_urls: Array.isArray(formData.certification_document_urls) ? formData.certification_document_urls : [],
        supporting_document_urls: Array.isArray(formData.supporting_document_urls) ? formData.supporting_document_urls : [],
      };
      
      // Debug: Log the payload before sending
      console.log("DEBUG: Profile completion payload:", JSON.stringify(payload, null, 2));
      console.log("DEBUG: Form data state:", formData);
      
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.PROFILE_COMPLETE}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success("Profile completed successfully!");
      
      // Clear drafts
      ProfileDraftStorage.clearDraft();
      
      // Update localStorage with new data
      if (response.data.profile_completion_percentage) {
        localStorage.setItem("profile_completion_percentage", response.data.profile_completion_percentage);
      }
      if (response.data.mandatory_fields_completed !== undefined) {
        localStorage.setItem("mandatory_fields_completed", response.data.mandatory_fields_completed);
      }
      
      // Navigate to the redirect path from response
      setTimeout(() => {
        const redirectPath = response.data.redirect_to || ROUTES.SPECIALIST_APPLICATION;
        navigate(redirectPath);
      }, 1500);

    } catch (error) {
      console.error("Profile completion error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      // Handle validation errors (422)
      if (error.response?.status === 422) {
        const responseData = error.response?.data;
        const validationErrors = responseData?.detail;
        
        console.error("Validation errors detail:", validationErrors);
        
        if (Array.isArray(validationErrors)) {
          // Parse validation errors and set them in the form
          const newErrors = {};
          validationErrors.forEach(err => {
            const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'unknown';
            let message = err.msg || err.message || 'Validation error';
            // Clean up message
            message = message.replace('Value error, ', '').replace('string_type_error, ', '');
            newErrors[field] = message;
            console.error(`Field error: ${field} - ${message}`);
          });
          setErrors(newErrors);
          
          // Show all errors as toast
          const errorMessages = validationErrors.map(err => {
            const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'unknown';
            const msg = err.msg || err.message || 'Validation error';
            return `${field}: ${msg.replace('Value error, ', '').replace('string_type_error, ', '')}`;
          });
          
          toast.error(`Validation errors: ${errorMessages.join('; ')}`, { 
            duration: 8000,
            icon: '❌'
          });
          
          // Scroll to top to see errors
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (typeof validationErrors === 'object' && validationErrors !== null) {
          // Handle object-based error response
          const errorMessage = validationErrors.message || validationErrors.detail || "Validation error. Please check all fields.";
          const errorList = validationErrors.errors || [];
          
          if (errorList.length > 0) {
            const newErrors = {};
            errorList.forEach(errMsg => {
              // Try to extract field name from error message
              const fieldMatch = errMsg.match(/(\w+)/);
              if (fieldMatch) {
                newErrors[fieldMatch[1]] = errMsg;
              }
            });
            setErrors(newErrors);
          }
          
          toast.error(errorMessage, { duration: 6000 });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Fallback for string errors
          toast.error(validationErrors || "Validation error. Please check all fields.", { duration: 6000 });
        }
      } else if (error.response?.status === 400) {
        // Handle "Profile already submitted" error
        const detail = error.response?.data?.detail;
        let errorMessage = "Bad Request";
        
        // Handle both string and object error responses
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object' && detail !== null) {
          errorMessage = detail.message || detail.error || detail.detail || JSON.stringify(detail);
        }
        
        if (errorMessage.toLowerCase().includes('already submitted')) {
          toast.error("Your profile has already been submitted for review!", { 
            duration: 5000,
            icon: '⚠️'
          });
          // Redirect to application status page
          setTimeout(() => {
            navigate(ROUTES.SPECIALIST_APPLICATION);
          }, 2000);
        } else {
          toast.error(errorMessage, { duration: 6000 });
        }
      } else if (error.response?.status === 500) {
        // Handle server errors (500)
        const detail = error.response?.data?.detail;
        let errorMessage = "Server error. Please try again later.";
        
        // Handle both string and object error responses
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object' && detail !== null) {
          // Extract message from error object
          errorMessage = detail.message || detail.error || "Server error occurred. Please contact support if this persists.";
          console.error("Server error details:", detail);
        }
        
        toast.error(errorMessage, { 
          duration: 8000,
          icon: '🔴'
        });
        setErrors({ form: errorMessage });
      } else {
        // Handle other errors
        const detail = error.response?.data?.detail;
        let errorMessage = "Failed to complete profile";
        
        // Handle both string and object error responses
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object' && detail !== null) {
          errorMessage = detail.message || detail.error || detail.detail || "An error occurred";
        }
        
        toast.error(errorMessage, { duration: 6000 });
        setErrors({ form: errorMessage });
      }
      
      if (error.response?.status === 401) {
        navigate(ROUTES.LOGIN);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completion percentage with real-time updates
  const getCompletionPercentage = () => {
    const mandatoryFields = [
      formData.profile_photo_url,
      formData.phone_number,
      formData.cnic_number,
      formData.gender,
      formData.date_of_birth,
      formData.qualification,
      formData.institution,
      formData.license_number,
      formData.license_authority,
      formData.license_expiry_date,
      formData.years_of_experience,
      formData.specialization.length > 0,
      formData.languages_spoken.length > 0,
      formData.license_document_url,
      formData.cnic_document_url,
      formData.degree_document_url,
      formData.consultation_modes.length > 0,
      formData.consultation_fee
      // availability_schedule is now optional, so removed from mandatory fields
    ];
    
    const optionalFields = [
      formData.current_affiliation,
      formData.clinic_address,
      formData.experience_summary,
      formData.specialties_in_mental_health.length > 0,
      formData.therapy_methods.length > 0,
      formData.certifications.length > 0
    ];
    
    const mandatoryCompleted = mandatoryFields.filter(Boolean).length;
    const optionalCompleted = optionalFields.filter(Boolean).length;
    
    // Mandatory fields are worth 70%, optional fields are worth 30%
    const mandatoryPercentage = (mandatoryCompleted / mandatoryFields.length) * 70;
    const optionalPercentage = (optionalCompleted / optionalFields.length) * 30;
    
    return Math.round(mandatoryPercentage + optionalPercentage);
  };

  const completionPercentage = getCompletionPercentage();
  
  // Update completion percentage in localStorage only (no backend calls)
  useEffect(() => {
    localStorage.setItem('profile_completion_percentage', completionPercentage.toString());
    // Removed backend call to prevent spam - completion is calculated client-side
  }, [completionPercentage]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
    }`}>
      {/* Sticky Header */}
      <div className={`sticky top-0 z-50 backdrop-blur-lg border-b ${
        darkMode ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-200"
      }`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Profile Picture Preview */}
              <div className={`w-16 h-16 rounded-full overflow-hidden border-4 ${
                formData.profile_photo_url 
                  ? "border-green-500" 
                  : darkMode ? "border-gray-600" : "border-gray-300"
              }`}>
                {profilePicturePreview || formData.profile_photo_url ? (
                  <img 
                    src={profilePicturePreview || formData.profile_photo_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    darkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}>
                    <User className="text-gray-400" size={24} />
                  </div>
                )}
              </div>
              
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Complete Your Profile
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {completionPercentage}% Complete
                    </div>
                    <div className={`flex-1 max-w-xs h-2 rounded-full overflow-hidden ${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    }`}>
                      <motion.div
                        className={`h-full rounded-full ${
                          completionPercentage === 100 
                            ? "bg-green-500" 
                            : completionPercentage >= 70 
                            ? "bg-indigo-500" 
                            : completionPercentage >= 40 
                            ? "bg-yellow-500" 
                            : "bg-orange-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPercentage}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  {lastSaved && (
                    <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                      • Auto-saved {lastSaved.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Progress Ring */}
              <div className="relative w-12 h-12">
                <svg className="transform -rotate-90 w-12 h-12">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className={darkMode ? "text-gray-700" : "text-gray-200"}
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPercentage / 100)}`}
                    className="text-indigo-500 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  {completionPercentage}
                </span>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-all ${
                  darkMode ? "bg-gray-700 text-yellow-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className={`mt-4 h-2 rounded-full overflow-hidden ${
            darkMode ? "bg-gray-700" : "bg-gray-200"
          }`}>
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Form */}
        <motion.div
          className={`rounded-2xl shadow-2xl overflow-hidden ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-0">
            <form onSubmit={handleSubmit}>
              {/* NEW LAYOUT - Hero Profile Section */}
              <div className={`p-8 border-b-2 ${darkMode ? "border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900" : "border-gray-100 bg-gradient-to-br from-indigo-50 to-blue-50"}`}>
                <div className="grid md:grid-cols-3 gap-8">
                  {/* LEFT: Profile Picture (Clickable) */}
                  <div className="md:col-span-1">
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleFileUpload('profile_photo', file);
                          }
                        }}
                        className="hidden"
                      />
                      <div className={`relative aspect-square rounded-3xl overflow-hidden border-4 transition-all group ${
                        formData.profile_photo_url 
                          ? "border-green-500 shadow-xl shadow-green-500/20" 
                          : "border-indigo-500 shadow-xl shadow-indigo-500/20 hover:border-indigo-400"
                      }`}>
                        {profilePicturePreview || formData.profile_photo_url ? (
                          <>
                            <img 
                              src={profilePicturePreview || formData.profile_photo_url} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="text-center text-white">
                                <Camera size={40} className="mx-auto mb-2" />
                                <p className="font-semibold">Change Photo</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className={`w-full h-full flex flex-col items-center justify-center ${
                            darkMode ? "bg-gray-700" : "bg-white"
                          } group-hover:bg-indigo-50 transition-colors`}>
                            <Camera className="text-indigo-500 mb-3" size={56} />
                            <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                              Click to Upload
                            </p>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                              Profile Photo *
                            </p>
                          </div>
                        )}
                        {uploadProgress.profile_photo !== undefined && uploadProgress.profile_photo < 100 && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <div className="text-center text-white">
                              <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                              <p className="font-bold text-lg">{uploadProgress.profile_photo}%</p>
                            </div>
                          </div>
                        )}
                        {formData.profile_photo_url && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle className="text-green-500 bg-white rounded-full" size={32} />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* RIGHT: Specialist Info & Bio */}
                  <div className="md:col-span-2 flex flex-col">
                    {/* Top: Specialist Type, Name, Email */}
                    <div className="mb-6">
                      {/* Specialist Type - BOLD */}
                      <div className={`inline-block px-4 py-2 rounded-full mb-4 ${
                        darkMode ? "bg-indigo-600 text-white" : "bg-indigo-600 text-white"
                      }`}>
                        <Award size={20} className="inline-block mr-2" />
                        <span className="text-xl font-black uppercase">
                          {localStorage.getItem("specialist_type")?.replace('_', ' ') || "SPECIALIST"}
                        </span>
                      </div>
                      
                      {/* Name */}
                      <h1 className={`text-4xl font-black mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {userInfo.name || "Loading..."}
                      </h1>
                      
                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <Globe size={18} className="text-indigo-500" />
                        <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {userInfo.email || "Loading..."}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Bio Section - Display Only */}
              <div className={`px-8 py-6 border-b-2 ${darkMode ? "border-gray-700 bg-gray-800/30" : "border-gray-100 bg-gray-50/50"}`}>
                <div className="flex items-start gap-3 mb-3">
                  <FileText size={20} className="text-indigo-500 mt-1" />
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Bio
                    </h3>
                    <div className={`text-base leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {formData.experience_summary || (
                        <span className={`italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          Your professional bio will appear here. Complete the Professional Summary field below to add your bio.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rest of Form Fields - Organized Sections */}
              <div className="p-8">
                {/* Personal Information Section */}
                <section className="mb-8">
                  <h2 className={`text-2xl font-bold mb-6 pb-2 border-b-2 ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>
                    Personal Information
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">

                    {/* Phone Number */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                          type="tel"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.phone_number
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                          placeholder="+923001234567"
                        />
                      </div>
                      {!errors.phone_number && formData.phone_number && (
                        <p className={`text-xs mt-1 ${
                          formData.phone_number.match(/^\+92\d{10}$/) 
                            ? darkMode ? "text-green-400" : "text-green-600"
                            : darkMode ? "text-yellow-400" : "text-yellow-600"
                        }`}>
                          {formData.phone_number.match(/^\+92\d{10}$/) 
                            ? "✓ Valid format" 
                            : "Format: +92XXXXXXXXXX (13 characters)"}
                        </p>
                      )}
                      {!errors.phone_number && !formData.phone_number && (
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Enter as: 03001234567 or +923001234567
                        </p>
                      )}
                      {errors.phone_number && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>
                      )}
                    </div>

                    {/* CNIC Number */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        CNIC Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                          type="text"
                          name="cnic_number"
                          value={formData.cnic_number}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.cnic_number
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                          placeholder="00000-0000000-0"
                        />
                      </div>
                      {!errors.cnic_number && formData.cnic_number && (
                        <p className={`text-xs mt-1 ${
                          formData.cnic_number.match(/^\d{5}-\d{7}-\d{1}$/) 
                            ? darkMode ? "text-green-400" : "text-green-600"
                            : darkMode ? "text-yellow-400" : "text-yellow-600"
                        }`}>
                          {formData.cnic_number.match(/^\d{5}-\d{7}-\d{1}$/) 
                            ? "✓ Valid format" 
                            : "Format: 00000-0000000-0"}
                        </p>
                      )}
                      {errors.cnic_number && (
                        <p className="text-red-500 text-xs mt-1">{errors.cnic_number}</p>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.gender
                            ? "border-red-500 focus:ring-red-300"
                            : darkMode
                            ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.gender && (
                        <p className="text-red-500 text-xs mt-1">{errors.gender}</p>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.date_of_birth
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                        />
                      </div>
                      {errors.date_of_birth && (
                        <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>
                      )}
                    </div>

                  </div>
                </section>

                {/* Professional Credentials Section */}
                <section className="mb-8">
                  <h2 className={`text-2xl font-bold mb-6 pb-2 border-b-2 ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>
                    Professional Credentials
                  </h2>
                  
                  <div className="space-y-6">

                    {/* Qualification */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Highest Qualification <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.qualification
                            ? "border-red-500 focus:ring-red-300"
                            : darkMode
                            ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="e.g., MS Clinical Psychology"
                      />
                      {errors.qualification && (
                        <p className="text-red-500 text-xs mt-1">{errors.qualification}</p>
                      )}
                    </div>

                    {/* Institution */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Institution <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="institution"
                        value={formData.institution}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.institution
                            ? "border-red-500 focus:ring-red-300"
                            : darkMode
                            ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="e.g., University of XYZ"
                      />
                      {errors.institution && (
                        <p className="text-red-500 text-xs mt-1">{errors.institution}</p>
                      )}
                    </div>

                    {/* License Number */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          License Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="license_number"
                          value={formData.license_number}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.license_number
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                          placeholder="LIC-12345"
                        />
                        {errors.license_number && (
                          <p className="text-red-500 text-xs mt-1">{errors.license_number}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          License Authority <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="license_authority"
                          value={formData.license_authority}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.license_authority
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                          placeholder="Medical Board"
                        />
                        {errors.license_authority && (
                          <p className="text-red-500 text-xs mt-1">{errors.license_authority}</p>
                        )}
                      </div>
                    </div>

                    {/* License Expiry & Years of Experience */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          License Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="license_expiry_date"
                          value={formData.license_expiry_date}
                          onChange={handleInputChange}
                          min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.license_expiry_date
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Must be a future date (license must be valid)
                        </p>
                        {errors.license_expiry_date && (
                          <p className="text-red-500 text-xs mt-1">{errors.license_expiry_date}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Years of Experience <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="years_of_experience"
                          value={formData.years_of_experience}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.years_of_experience
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                          min="0"
                          max="60"
                        />
                        {errors.years_of_experience && (
                          <p className="text-red-500 text-xs mt-1">{errors.years_of_experience}</p>
                        )}
                      </div>
                    </div>

                    {/* Specialization (Auto-filled with manual fallback) */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Primary Specialization <span className="text-red-500">*</span>
                      </label>
                      {formData.specialization.length > 0 ? (
                        <div className={`px-4 py-2 border rounded-lg flex items-center justify-between ${
                          errors.specialization
                            ? "border-red-500"
                            : darkMode 
                            ? "border-green-600 bg-green-900/20 text-green-300" 
                            : "border-green-500 bg-green-50 text-green-700"
                        }`}>
                          <span className="font-medium">
                            ✓ {formData.specialization.map(s => s.replace('_', ' ').toUpperCase()).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <select
                          value={formData.specialization[0] || ''}
                          onChange={(e) => setFormData(prev => ({...prev, specialization: [e.target.value]}))}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.specialization
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                        >
                          <option value="">Select your specialization</option>
                          {dropdownOptions?.specialist_types?.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {!errors.specialization && formData.specialization.length > 0 && (
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          ✓ Loaded from your registration
                        </p>
                      )}
                      {!errors.specialization && formData.specialization.length === 0 && (
                        <p className={`text-xs mt-1 ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>
                          Please select your specialization type manually
                        </p>
                      )}
                      {errors.specialization && (
                        <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>
                      )}
                    </div>

                    {/* Languages Spoken */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Languages Spoken <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.languages_spoken.join(', ')}
                        onChange={(e) => handleArrayInput('languages_spoken', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.languages_spoken
                            ? "border-red-500 focus:ring-red-300"
                            : darkMode
                            ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="e.g., English, Urdu, Punjabi (comma-separated)"
                      />
                      {errors.languages_spoken && (
                        <p className="text-red-500 text-xs mt-1">{errors.languages_spoken}</p>
                      )}
                    </div>

                    {/* Certifications (Optional) */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Certifications (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.certifications.join(', ')}
                        onChange={(e) => handleArrayInput('certifications', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          darkMode
                          ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                          : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="e.g., CBT, DBT, EMDR (comma-separated)"
                      />
                    </div>

                    {/* Document Uploads - Mandatory */}
                    <div>
                      <label className={`block text-sm font-bold mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <FileText className="inline-block mr-2" size={18} />
                        Required Documents <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            License Document <span className="text-red-500">*</span>
                          </label>
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                            formData.license_document_url 
                              ? darkMode ? "border-green-500 bg-green-900/20" : "border-green-500 bg-green-50"
                              : darkMode ? "border-gray-600" : "border-gray-300"
                          }`}>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload('license', e.target.files[0])}
                              className="hidden"
                              id="license-upload"
                            />
                            <label htmlFor="license-upload" className="cursor-pointer">
                              <Upload className={`mx-auto mb-2 ${formData.license_document_url ? "text-green-600" : darkMode ? "text-gray-400" : "text-gray-500"}`} size={24} />
                              <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {formData.license_document_url ? "✓ License uploaded" : "Click to upload"}
                              </p>
                            </label>
                            {uploadProgress.license !== undefined && uploadProgress.license < 100 && (
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${uploadProgress.license}%` }} />
                              </div>
                            )}
                          </div>
                          {errors.license_document_url && (
                            <p className="text-red-500 text-xs mt-1">{errors.license_document_url}</p>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            CNIC/ID Document <span className="text-red-500">*</span>
                          </label>
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                            formData.cnic_document_url 
                              ? darkMode ? "border-green-500 bg-green-900/20" : "border-green-500 bg-green-50"
                              : darkMode ? "border-gray-600" : "border-gray-300"
                          }`}>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload('cnic', e.target.files[0])}
                              className="hidden"
                              id="cnic-upload"
                            />
                            <label htmlFor="cnic-upload" className="cursor-pointer">
                              <Upload className={`mx-auto mb-2 ${formData.cnic_document_url ? "text-green-600" : darkMode ? "text-gray-400" : "text-gray-500"}`} size={24} />
                              <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {formData.cnic_document_url ? "✓ CNIC uploaded" : "Click to upload"}
                              </p>
                            </label>
                            {uploadProgress.cnic !== undefined && uploadProgress.cnic < 100 && (
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${uploadProgress.cnic}%` }} />
                              </div>
                            )}
                          </div>
                          {errors.cnic_document_url && (
                            <p className="text-red-500 text-xs mt-1">{errors.cnic_document_url}</p>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Highest Degree <span className="text-red-500">*</span>
                          </label>
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                            formData.degree_document_url 
                              ? darkMode ? "border-green-500 bg-green-900/20" : "border-green-500 bg-green-50"
                              : darkMode ? "border-gray-600" : "border-gray-300"
                          }`}>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload('degree', e.target.files[0])}
                              className="hidden"
                              id="degree-upload"
                            />
                            <label htmlFor="degree-upload" className="cursor-pointer">
                              <Upload className={`mx-auto mb-2 ${formData.degree_document_url ? "text-green-600" : darkMode ? "text-gray-400" : "text-gray-500"}`} size={24} />
                              <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {formData.degree_document_url ? "✓ Degree uploaded" : "Click to upload"}
                              </p>
                            </label>
                            {uploadProgress.degree !== undefined && uploadProgress.degree < 100 && (
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${uploadProgress.degree}%` }} />
                              </div>
                            )}
                          </div>
                          {errors.degree_document_url && (
                            <p className="text-red-500 text-xs mt-1">{errors.degree_document_url}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Document Uploads - Optional */}
                    <div>
                      <label className={`block text-sm font-bold mb-4 mt-6 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <Award className="inline-block mr-2" size={18} />
                        Optional Documents
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Certifications
                          </label>
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                            darkMode ? "border-gray-600" : "border-gray-300"
                          }`}>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              multiple
                              onChange={(e) => {
                                Array.from(e.target.files).forEach(file => {
                                  handleFileUpload('certification', file);
                                });
                              }}
                              className="hidden"
                              id="certification-upload"
                            />
                            <label htmlFor="certification-upload" className="cursor-pointer">
                              <Upload className={`mx-auto mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`} size={24} />
                              <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                Click to upload multiple files
                              </p>
                            </label>
                            {formData.certification_document_urls && formData.certification_document_urls.length > 0 && (
                              <p className="text-xs mt-2 text-green-600">
                                {formData.certification_document_urls.length} file(s) uploaded
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Supporting Documents
                          </label>
                          <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                            darkMode ? "border-gray-600" : "border-gray-300"
                          }`}>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              multiple
                              onChange={(e) => {
                                Array.from(e.target.files).forEach(file => {
                                  handleFileUpload('supporting_document', file);
                                });
                              }}
                              className="hidden"
                              id="supporting-upload"
                            />
                            <label htmlFor="supporting-upload" className="cursor-pointer">
                              <Upload className={`mx-auto mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`} size={24} />
                              <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                Click to upload multiple files
                              </p>
                            </label>
                            {formData.supporting_document_urls && formData.supporting_document_urls.length > 0 && (
                              <p className="text-xs mt-2 text-green-600">
                                {formData.supporting_document_urls.length} file(s) uploaded
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Practice Details Section */}
                <section className="mb-8">
                  <h2 className={`text-2xl font-bold mb-6 pb-2 border-b-2 ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>
                    Practice Details
                  </h2>
                  
                  <div className="space-y-6">

                    {/* Current Affiliation */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Current Affiliation <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="current_affiliation"
                        value={formData.current_affiliation}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.current_affiliation
                            ? "border-red-500 focus:ring-red-300"
                            : darkMode
                            ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="e.g., Aga Khan Hospital, Private Practice"
                      />
                      {errors.current_affiliation && (
                        <p className="text-red-500 text-xs mt-1">{errors.current_affiliation}</p>
                      )}
                    </div>

                    {/* Clinic Address */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Clinic Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="clinic_address"
                        value={formData.clinic_address}
                        onChange={handleInputChange}
                        rows="3"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.clinic_address
                            ? "border-red-500 focus:ring-red-300"
                            : darkMode
                            ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="Complete clinic address (street, city, province, postal code)"
                        minLength={10}
                        maxLength={500}
                      />
                      {errors.clinic_address && (
                        <p className="text-red-500 text-xs mt-1">{errors.clinic_address}</p>
                      )}
                    </div>

                    {/* Consultation Modes */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Consultation Modes <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {dropdownOptions?.consultation_modes?.map((mode) => (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => handleMultiSelect('consultation_modes', mode.value)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                              formData.consultation_modes.includes(mode.value)
                                ? "bg-indigo-600 text-white"
                                : darkMode
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      {errors.consultation_modes && (
                        <p className="text-red-500 text-xs mt-1">{errors.consultation_modes}</p>
                      )}
                    </div>

                    {/* Consultation Fee (PKR Only) */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Consultation Fee (PKR) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400 font-semibold">PKR</span>
                        <input
                          type="number"
                          name="consultation_fee"
                          value={formData.consultation_fee}
                          onChange={handleInputChange}
                          className={`w-full pl-16 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.consultation_fee
                              ? "border-red-500 focus:ring-red-300"
                              : darkMode
                              ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                              : "border-gray-300 focus:ring-indigo-500"
                          }`}
                          placeholder="e.g., 3000"
                          min="0"
                        />
                      </div>
                      {errors.consultation_fee && (
                        <p className="text-red-500 text-xs mt-1">{errors.consultation_fee}</p>
                      )}
                    </div>

                    {/* Availability Schedule - Separate Online/In-Person per Day with Time Pickers */}
                    <div>
                      <label className={`block text-sm font-bold mb-4 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <Clock size={18} className="text-indigo-500" />
                        Weekly Availability Schedule <span className="text-gray-500 text-sm font-normal">(Optional)</span>
                      </label>
                      <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Set your availability times for each consultation mode per day
                      </p>
                      <div className={`p-4 rounded-xl border-2 ${darkMode ? "border-gray-600 bg-gray-700/50" : "border-gray-200 bg-gray-50"}`}>
                        <div className="space-y-4">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                            const dayMap = {
                              'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
                              'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun'
                            };
                            const shortDay = dayMap[day];
                            const daySchedule = formData.availability_schedule?.[shortDay] || {};
                            
                            // Check if day is marked as available (has any valid data structure)
                            // Skip if it's an array (invalid data)
                            const dayHasData = daySchedule && 
                              typeof daySchedule === 'object' && 
                              !Array.isArray(daySchedule) &&
                              Object.keys(daySchedule).length > 0;
                            
                            // Check if day has complete availability data
                            const hasOnline = daySchedule.online && 
                              typeof daySchedule.online === 'object' &&
                              daySchedule.online.from && 
                              daySchedule.online.to;
                            const hasInPerson = daySchedule.in_person && 
                              typeof daySchedule.in_person === 'object' &&
                              daySchedule.in_person.from && 
                              daySchedule.in_person.to;
                            
                            // Day is available if it exists in the schedule (even with empty times)
                            // Use explicit boolean conversion to ensure React detects changes
                            const dayExists = formData.availability_schedule && 
                                             formData.availability_schedule[shortDay] && 
                                             typeof formData.availability_schedule[shortDay] === 'object' &&
                                             !Array.isArray(formData.availability_schedule[shortDay]);
                            const isAvailable = Boolean(dayExists);
                            
                            // Generate time options (12:00 AM to 11:30 PM in 30-minute increments)
                            const generateTimeOptions = () => {
                              const options = [];
                              const periods = ['AM', 'PM'];
                              
                              periods.forEach(period => {
                                for (let hour = 12; hour >= 1; hour--) {
                                  ['00', '30'].forEach(minute => {
                                    const displayHour = hour.toString().padStart(2, '0');
                                    options.push(`${displayHour}:${minute} ${period}`);
                                  });
                                }
                              });
                              
                              // Sort properly (12:00 AM first, then 12:30 AM, 01:00 AM, etc.)
                              return options.sort((a, b) => {
                                const [aTime, aPeriod] = a.split(' ');
                                const [bTime, bPeriod] = b.split(' ');
                                const [aHour, aMin] = aTime.split(':').map(Number);
                                const [bHour, bMin] = bTime.split(':').map(Number);
                                
                                // Convert to 24-hour for comparison
                                let aHour24 = aHour;
                                let bHour24 = bHour;
                                if (aPeriod === 'PM' && aHour !== 12) aHour24 += 12;
                                if (aPeriod === 'AM' && aHour === 12) aHour24 = 0;
                                if (bPeriod === 'PM' && bHour !== 12) bHour24 += 12;
                                if (bPeriod === 'AM' && bHour === 12) bHour24 = 0;
                                
                                return (aHour24 * 60 + aMin) - (bHour24 * 60 + bMin);
                              });
                            };
                            
                            const timeOptions = generateTimeOptions();
                            
                            // Helper to update time field
                            const updateTimeField = (mode, field, value) => {
                              setFormData(prev => ({
                                ...prev,
                                availability_schedule: {
                                  ...prev.availability_schedule,
                                  [shortDay]: {
                                    ...prev.availability_schedule[shortDay],
                                    [mode]: {
                                      ...(prev.availability_schedule[shortDay]?.[mode] || {}),
                                      [field]: value
                                    }
                                  }
                                }
                              }));
                            };
                            
                            // Helper to render time picker
                            const renderTimePicker = (mode, label, icon, isOnline) => {
                              const modeData = daySchedule[mode] || {};
                              const isModeSelected = formData.consultation_modes.includes(mode === 'online' ? 'online' : 'in_person');
                              
                              if (!isModeSelected) return null;
                              
                              // Use conditional classes for Tailwind (can't use template literals)
                              const borderColor = isOnline 
                                ? (darkMode ? "border-blue-600 bg-blue-900/20" : "border-blue-300 bg-blue-50")
                                : (darkMode ? "border-green-600 bg-green-900/20" : "border-green-300 bg-green-50");
                              const textColor = isOnline
                                ? (darkMode ? "text-blue-300" : "text-blue-700")
                                : (darkMode ? "text-green-300" : "text-green-700");
                              const inputBorderColor = isOnline
                                ? (darkMode ? "border-blue-500 focus:ring-blue-500" : "border-blue-300 focus:ring-blue-500")
                                : (darkMode ? "border-green-500 focus:ring-green-500" : "border-green-300 focus:ring-green-500");
                              
                              return (
                                <div className={`p-3 rounded-lg border ${borderColor}`}>
                                  <label className={`block text-xs font-medium mb-2 ${textColor}`}>
                                    {icon} {label}
                                  </label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* From Time */}
                                    <div>
                                      <label className={`block text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>From</label>
                                      <select
                                        value={modeData.from || ''}
                                        onChange={(e) => updateTimeField(mode, 'from', e.target.value)}
                                        className={`w-full px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 ${
                                          darkMode
                                            ? `${inputBorderColor} bg-gray-700 text-white`
                                            : `${inputBorderColor} bg-white`
                                        }`}
                                      >
                                        <option value="">Select time</option>
                                        {timeOptions.map(time => (
                                          <option key={`from-${time}`} value={time}>{time}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* To Time */}
                                    <div>
                                      <label className={`block text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>To</label>
                                      <select
                                        value={modeData.to || ''}
                                        onChange={(e) => updateTimeField(mode, 'to', e.target.value)}
                                        className={`w-full px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 ${
                                          darkMode
                                            ? `${inputBorderColor} bg-gray-700 text-white`
                                            : `${inputBorderColor} bg-white`
                                        }`}
                                      >
                                        <option value="">Select time</option>
                                        {timeOptions.map(time => (
                                          <option key={`to-${time}`} value={time}>{time}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            };
                            
                            return (
                              <div key={`${day}-${isAvailable}`} className={`p-4 rounded-lg border transition-all ${
                                isAvailable
                                  ? darkMode ? "bg-indigo-900/30 border-indigo-500/50" : "bg-indigo-50 border-indigo-200" 
                                  : darkMode ? "bg-gray-800/50 border-gray-600" : "bg-white border-gray-200"
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        const newChecked = !isAvailable;
                                        
                                        setFormData(prev => {
                                          const currentSchedule = prev.availability_schedule || {};
                                          
                                          if (!newChecked) {
                                            // Remove day from schedule
                                            const newSchedule = { ...currentSchedule };
                                            delete newSchedule[shortDay];
                                            return {
                                              ...prev,
                                              availability_schedule: newSchedule
                                            };
                                          } else {
                                            // Initialize with empty structure when checked
                                            const newSchedule = {
                                              ...currentSchedule,
                                              [shortDay]: {
                                                online: { from: '', to: '' },
                                                in_person: { from: '', to: '' }
                                              }
                                            };
                                            return {
                                              ...prev,
                                              availability_schedule: newSchedule
                                            };
                                          }
                                        });
                                        
                                        // Clear validation error when toggled
                                        if (errors.availability_schedule) {
                                          setErrors(prev => ({ ...prev, availability_schedule: '' }));
                                        }
                                      }}
                                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                        isAvailable
                                          ? darkMode 
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                                            : "bg-indigo-500 hover:bg-indigo-600 text-white"
                                          : darkMode
                                            ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                      }`}
                                      style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                                    >
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                        isAvailable
                                          ? "border-white bg-white"
                                          : darkMode
                                            ? "border-gray-400 bg-transparent"
                                            : "border-gray-500 bg-transparent"
                                      }`}>
                                        {isAvailable && (
                                          <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className={`flex items-center gap-2 font-semibold select-none ${
                                        isAvailable ? "text-white" : darkMode ? "text-gray-300" : "text-gray-700"
                                      }`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                          isAvailable
                                            ? "bg-white text-indigo-600" 
                                            : darkMode ? "bg-gray-600 text-gray-400" : "bg-gray-300 text-gray-600"
                                        }`}>
                                          {day.substring(0, 1)}
                                        </div>
                                        {day}
                                      </div>
                                    </button>
                                  </div>
                                </div>
                                
                                {!isAvailable && (
                                  <p className={`text-xs italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                                    Not available on this day
                                  </p>
                                )}
                                
                                {isAvailable && (
                                  <div className="space-y-3">
                                    {renderTimePicker('online', 'Online Consultation', '🌐', true)}
                                    {renderTimePicker('in_person', 'In-Person Consultation', '🏢', false)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className={`text-xs mt-3 flex items-start gap-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          <span>💡</span>
                          <span>Check the day checkbox and select your availability times from the dropdowns (e.g., 08:00 AM - 05:00 PM). Each consultation mode can have different hours.</span>
                        </p>
                      </div>
                      {errors.availability_schedule && (
                        <p className="text-red-500 text-xs mt-1">{errors.availability_schedule}</p>
                      )}
                    </div>

                    {/* Mental Health Specialties */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Mental Health Specialties
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {dropdownOptions?.mental_health_specialties?.slice(0, 8).map((spec) => (
                          <button
                            key={spec.value}
                            type="button"
                            onClick={() => handleMultiSelect('specialties_in_mental_health', spec.value)}
                            className={`px-3 py-1 text-sm rounded-lg transition-all ${
                              formData.specialties_in_mental_health.includes(spec.value)
                                ? "bg-indigo-600 text-white"
                                : darkMode
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {spec.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Therapy Methods */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Therapy Methods
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {dropdownOptions?.therapy_methods?.slice(0, 8).map((method) => (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => handleMultiSelect('therapy_methods', method.value)}
                            className={`px-3 py-1 text-sm rounded-lg transition-all ${
                              formData.therapy_methods.includes(method.value)
                                ? "bg-indigo-600 text-white"
                                : darkMode
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Experience Summary */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Professional Summary
                      </label>
                      <textarea
                        name="experience_summary"
                        value={formData.experience_summary}
                        onChange={handleInputChange}
                        rows="4"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          darkMode
                          ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500"
                          : "border-gray-300 focus:ring-indigo-500"
                        }`}
                        placeholder="Brief professional bio (50-1000 characters)"
                        minLength={50}
                        maxLength={1000}
                      />
                    </div>

                    {/* Accepting New Patients */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="accepting_new_patients"
                        name="accepting_new_patients"
                        checked={formData.accepting_new_patients}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                      />
                      <label 
                        htmlFor="accepting_new_patients"
                        className={`text-sm cursor-pointer select-none ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Currently accepting new patients
                      </label>
                    </div>
                  </div>
                </section>
              </div>

              {/* Submit Button - Full Width Bottom */}
              <div className={`p-6 border-t-2 ${darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex justify-center">
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-12 py-4 rounded-2xl font-black text-xl flex items-center gap-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-70 shadow-2xl shadow-indigo-500/50 transition-all"
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.5)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting Your Profile...
                      </>
                    ) : (
                      <>
                        <Save size={28} />
                        Complete My Profile
                        <CheckCircle size={28} />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SpecialistCompleteProfileNew;
