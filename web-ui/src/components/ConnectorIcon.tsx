import React from 'react';
import { Database } from 'lucide-react';

interface ConnectorIconProps {
  connectorId: string;
  className?: string;
  size?: number;
}

// Simple SVG icons for professional appearance
const GitHubIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const SlackIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

const ConfluenceIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M20.168 3.831c-1.48-2.156-4.314-2.605-6.339-1.302-1.19.767-2.091 2.025-2.528 3.549-.125.436-.183.887-.172 1.34.011.454.096.903.253 1.33.441 1.202 1.363 2.212 2.545 2.79 1.181.577 2.557.694 3.801.323 1.244-.372 2.295-1.245 2.903-2.413.609-1.168.738-2.555.365-3.833-.373-1.278-1.245-2.384-2.413-2.992-1.168-.609-2.555-.738-3.833-.365zm-16.337 16.338c1.48 2.156 4.314 2.605 6.339 1.302 1.19-.767 2.091-2.025 2.528-3.549.125-.436.183-.887.172-1.34-.011-.454-.096-.903-.253-1.33-.441-1.202-1.363-2.212-2.545-2.79-1.181-.577-2.557-.694-3.801-.323-1.244.372-2.295 1.245-2.903 2.413-.609 1.168-.738 2.555-.365 3.833.373 1.278 1.245 2.384 2.413 2.992 1.168.609 2.555.738 3.833.365z"/>
  </svg>
);

const RetailIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
  </svg>
);

export const ConnectorIcon: React.FC<ConnectorIconProps> = ({ 
  connectorId, 
  className = '', 
  size = 24 
}) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    'github': GitHubIcon,
    'slack': SlackIcon,
    'confluence': ConfluenceIcon,
    'retail-mock': RetailIcon,
    'retail': RetailIcon,
  };

  const IconComponent = iconMap[connectorId];

  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // Fallback icon for unknown connectors
  return <Database className={className} width={size} height={size} />;
};

export default ConnectorIcon;
