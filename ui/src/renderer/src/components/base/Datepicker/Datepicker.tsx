import { Calendar } from 'iconoir-react';
import { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker.css';

interface DatepickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (dates: [Date | null, Date | null]) => void;
    placeholderText?: string;
    className?: string;
}

const Datepicker = ({
    startDate,
    endDate,
    onChange,
    placeholderText = 'Select date range',
    className,
}: DatepickerProps) => {
    // Custom Input to match the style
    const CustomInput = forwardRef<HTMLInputElement, any>(
        ({ value, onClick, className }, ref) => (
            <div
                className={`relative flex items-center overflow-hidden cursor-pointer !px-0 ${className}`}
                onClick={onClick}
            >
                <Calendar className='absolute left-3 w-4 h-4 text-cradle-text-muted z-10 flex-shrink-0' />
                <input
                    value={value}
                    className='w-full bg-transparent pl-9 pr-4 py-2 outline-none text-sm font-mono text-cradle-text-primary placeholder:text-cradle-text-muted cursor-pointer h-full'
                    readOnly
                    ref={ref}
                    placeholder={placeholderText}
                />
            </div>
        ),
    );

    CustomInput.displayName = 'CustomDateInput';

    return (
        <div className='relative w-full'>
            <ReactDatePicker
                selected={startDate}
                onChange={onChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                showTimeSelect
                dateFormat='yyyy-MM-dd HH:mm'
                portalId='portal-root'
                customInput={<CustomInput className={className} />}
                isClearable={false}
                placeholderText={placeholderText}
                wrapperClassName='w-full'
                popperClassName='z-[9999]'
                popperModifiers={[
                    {
                        name: 'preventOverflow',
                        options: {
                            boundary: 'viewport',
                        },
                    },
                    {
                        name: 'flip',
                        options: {
                            fallbackPlacements: ['bottom-end', 'top-start', 'top-end'],
                        },
                    },
                ]}
            />
        </div>
    );
};

export default Datepicker;
