
import React from 'react';
import { Button as ShadcnButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<typeof ShadcnButton> & {
  gradient?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  gradient = false,
  size = 'md',
  fullWidth = false,
  ...props 
}) => {
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-5 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  return (
    <ShadcnButton
      className={cn(
        'font-medium rounded-md transition-all',
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
};

export default Button;
