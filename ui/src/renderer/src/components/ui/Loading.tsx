import Logo from './Logo';

/**
 * Loading component - Full-screen loading indicator with CRADLE logo and spinner
 *
 * @example
 * ```tsx
 * <Loading />
 * ```
 */
export default function Loading(): JSX.Element {
  return (
    <div className='flex flex-col items-center justify-center h-screen text-center'>
      <div className='mb-8 w-[370px]'>
        <Logo text={true} />
      </div>
      <svg
        className='spinner-ring spinner-primary spinner-xl dark:[--spinner-color:--white]'
        viewBox='25 25 50 50'
        strokeWidth='5'
      >
        <circle cx='50' cy='50' r='20' />
      </svg>
    </div>
  );
}
