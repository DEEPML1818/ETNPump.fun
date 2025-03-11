// pages/index.js
import React from 'react';
import Link from 'next/link';

const HomePage = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to PumpFun Clone</h1>
      <p className="mb-8">A decentralized platform with a secure bonding curve mechanism and dynamic fees.</p>
      <Link href="/dashboard">
        <a className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Enter Dashboard
        </a>
      </Link>
    </div>
  );
};

export default HomePage;
