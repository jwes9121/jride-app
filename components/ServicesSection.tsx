
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ServicesSection() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const services = [
    {
      id: 'tricycle-ride',
      title: 'Tricycle Ride',
      description: 'Your daily ride, faster and safer — solo or group, sakay na!',
      icon: 'ri-truck-line',
      color: 'bg-orange-500',
      href: '/ride',
      available: true
    },
    {
      id: 'ride-share',
      title: 'Ride Share',
      subtitle: '(Tricycle only)',
      description: 'Hop in with another passenger on the same route — faster booking when solo rides are full.',
      icon: 'ri-group-line',
      color: 'bg-green-500',
      href: '/tricycle-rideshare',
      available: true
    },
    {
      id: 'food-delivery',
      title: 'Food Delivery',
      description: 'From local kitchens to your door — kain na agad.',
      icon: 'ri-restaurant-line',
      color: 'bg-orange-500',
      href: '/delivery',
      available: true
    },
    {
      id: 'errand-service',
      title: 'Errand Service',
      description: 'Skip the hassle — let a rider pay bills, buy groceries, or run simple tasks for you.',
      icon: 'ri-shopping-bag-line',
      color: 'bg-green-500',
      href: '/errand',
      available: true
    },
    {
      id: 'parcel-delivery',
      title: 'Parcel Delivery',
      subtitle: '(Coming Soon)',
      description: 'Best buddy for online live sellers and shops. Fast, easy package delivery.',
      icon: 'ri-box-line',
      color: 'bg-gray-400',
      href: '#',
      available: false
    },
    {
      id: 'money-transfer',
      title: 'Money Transfer',
      subtitle: '(Coming Soon)',
      description: 'Cash to cash, hassle-free. Send or receive money safely, no apps needed.',
      icon: 'ri-money-dollar-circle-line',
      color: 'bg-gray-400',
      href: '#',
      available: false
    }
  ];

  const onboardingSlides = [
    {
      title: 'Book a Ride',
      description: 'Choose from tricycle, motorcycle, or ride-share options. Pin your location and destination easily.',
      icon: 'ri-map-pin-line',
      color: 'bg-orange-500'
    },
    {
      title: 'Pay Easily',
      description: 'Use your wallet, reward points, or pay cash. Transparent pricing with no hidden fees.',
      icon: 'ri-wallet-line',
      color: 'bg-green-500'
    },
    {
      title: 'Earn Points & Rewards',
      description: 'Get 1 point per ₱30 spent. Use points for free rides and unlock membership tiers.',
      icon: 'ri-gift-line',
      color: 'bg-orange-500'
    }
  ];

  const handleServiceClick = (service: any) => {
    if (!service.available) {
      // Show coming soon notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 left-4 right-4 bg-gray-600 text-white p-4 rounded-xl z-50 text-center';
      notification.innerHTML = `
        <div class="font-semibold">🚧 ${service.title}</div>
        <div class="text-sm">Coming soon! We're working hard to bring this service to you.</div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
      return;
    }

    // Check if first time user needs onboarding
    const hasSeenOnboarding = localStorage.getItem('j-ride-onboarding-seen');
    if (!hasSeenOnboarding && service.id === 'tricycle-ride') {
      setShowOnboarding(true);
      return;
    }

    // Navigate to service
    if (service.href !== '#') {
      window.location.href = service.href;
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('j-ride-onboarding-seen', 'true');
    setShowOnboarding(false);
    setOnboardingStep(0);
    window.location.href = '/ride';
  };

  const nextOnboardingStep = () => {
    if (onboardingStep < onboardingSlides.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Mga Serbisyo</h2>
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-sm text-orange-600 font-medium hover:text-orange-700"
          >
            Paano ba?
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceClick(service)}
              className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                service.available 
                  ? 'border-gray-200 hover:border-orange-300 bg-white' 
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <i className={`${service.icon} text-2xl text-white`}></i>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`font-bold ${service.available ? 'text-gray-900' : 'text-gray-500'}`}>
                      {service.title}
                    </h3>
                    {service.subtitle && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        service.available 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {service.subtitle}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    service.available ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    👉 "{service.description}"
                  </p>
                  
                  {!service.available && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                      <i className="ri-time-line"></i>
                      <span>Malapit na!</span>
                    </div>
                  )}
                </div>

                {service.available && (
                  <div className="flex-shrink-0">
                    <i className="ri-arrow-right-line text-xl text-gray-400"></i>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Dispatcher Quick Call */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => window.location.href = 'tel:09176543210'}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-colors flex items-center justify-center space-x-2"
          >
            <i className="ri-phone-line text-lg"></i>
            <span>Dispatcher Quick Call</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Emergency</span>
          </button>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 ${onboardingSlides[onboardingStep].color} rounded-full mx-auto mb-4 flex items-center justify-center`}>
                <i className={`${onboardingSlides[onboardingStep].icon} text-3xl text-white`}></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {onboardingSlides[onboardingStep].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {onboardingSlides[onboardingStep].description}
              </p>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center space-x-2 mb-6">
              {onboardingSlides.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === onboardingStep ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={nextOnboardingStep}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                {onboardingStep < onboardingSlides.length - 1 ? 'Susunod' : 'Simulan na!'}
              </button>
              
              <button
                onClick={() => {
                  setShowOnboarding(false);
                  setOnboardingStep(0);
                }}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Mamaya na lang
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Madali lang gamitin ang J-Ride!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
