const MAX_WIDTH_CLASSES = {
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '3xl': 'max-w-3xl',
  '2xl': 'max-w-2xl',
};

/**
 * Shared shell for app pages — horizontal padding matches the navbar;
 * on lg+ viewports content is left-anchored (mr-auto) instead of centered.
 */
export default function PageContainer({
  children,
  maxWidth = '7xl',
  className = '',
  innerClassName = '',
}) {
  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth] || MAX_WIDTH_CLASSES['7xl'];

  return (
    <div
      className={`min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 md:py-8 ${className}`.trim()}
    >
      <div
        className={`w-full ${maxWidthClass} mx-auto lg:mx-0 lg:mr-auto space-y-6 ${innerClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
