import React from 'react';

interface DashboardHeadingProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

const DashboardHeading: React.FC<DashboardHeadingProps> = ({
  text,
  className = '',
  style,
}) => {
  const words = text.split(' ');

  return (
    <h1 className={className} style={style}>
      {words.map((word, index) => {
        const spanClass = index % 2 === 0 ? 'dashboard-heading-gradient' : 'dashboard-heading-white';
        return (
          <span key={`${word}-${index}`} className={spanClass}>
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </h1>
  );
};

export default DashboardHeading;
