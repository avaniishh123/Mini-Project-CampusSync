import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary-50 to-white relative overflow-hidden">
      {/* Slide up animation container */}
      <div className="animate-slide-up bg-white rounded-3xl shadow-xl p-10 md:p-16 flex flex-col items-center w-full max-w-xl mx-auto mt-24">
        <h1 className="text-4xl font-bold text-primary-700 mb-4 text-center">Welcome to CampusSync</h1>
        <p className="text-lg text-gray-700 mb-8 text-center">
          Your all-in-one platform for campus news, events, opportunities, and student networking. Join your campus community today!
        </p>
        <Button
          variant="primary"
          size="large"
          className="w-full md:w-auto"
          onClick={() => navigate('/login')}
        >
          Get Started
        </Button>
      </div>
      {/* Background animation effect */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary-100 to-transparent pointer-events-none" />
    </div>
  );
};

export default Landing;
