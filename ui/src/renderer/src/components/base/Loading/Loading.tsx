import Logo from '../Logo/Logo';

interface LoadingProps {
    logo: boolean;
    text?: string | null;
}

/**
 * Loading component - Full-screen loading indicator with CRADLE logo and spinner
 *
 * @example
 * ```tsx
 * <Loading />
 * ```
 */
export default function Loading({ logo = false, text = null }): JSX.Element {
    return (
        <div className='flex flex-col items-center justify-center h-screen text-center'>
            {logo || text && (
                <div className='mb-8 w-[370px]'>
                    {logo && <Logo text={true} />}
                    {text && <span className='text-2xl font-bold'>{text}</span>}
                </div>
            )}
            <svg
                className='spinner-ring spinner-primary spinner-xl dark:[--spinner-color:#ffffff]'
                viewBox='25 25 50 50'
                strokeWidth='5'
            >
                <circle cx='50' cy='50' r='20' />
            </svg>
        </div>
    );
}
