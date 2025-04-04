import { motion } from 'framer-motion';
import Link from 'next/link';
import React from 'react';

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

const CustomButton = ({
  href,        // If provided, the button will be a link.
  onClick,     // Callback for onClick events.
  children,    // Button label/content.
  bgColor = '#00d18f',  // Default background color.
  textColor = '#fff',   // Default text color.
  style = {}   // Additional styles.
}) => {
  const baseStyle = {
    background: bgColor,
    color: textColor,
    border: 'none',
    borderRadius: '4px',
    padding: '0.8rem 1.2rem',
    fontSize: '1rem',
    cursor: 'pointer',
    textDecoration: 'none', // For link buttons.
    display: 'inline-block',
    ...style
  };

  if (href) {
    return (
      <Link href={href} passHref legacyBehavior>
        <motion.a
          style={baseStyle}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={onClick}
        >
          {children}
        </motion.a>
      </Link>
    );
  }

  return (
    <motion.button
      style={baseStyle}
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
};

export default CustomButton;
