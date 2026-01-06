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
    open?: boolean;
    onClickOutside?: () => void;
}

const Datepicker = ({
    startDate,
    endDate,
    onChange,
    placeholderText = 'Select date range',
    className,
    open,
    onClickOutside,
}: DatepickerProps) => {
    const CustomInput = forwardRef<HTMLInputElement, any>(
        (
            {
                value,
                onClick,
                onChange,
                onBlur,
                onFocus,
                onKeyDown,
                className,
                placeholder,
            },
            ref,
        ) => (
            <div className='relative flex items-center'>
                <Calendar className='absolute left-3 w-4 h-4 text-cradle-text-muted z-10 pointer-events-none' />
                <input
                    ref={ref}
                    value={value}
                    onClick={onClick}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder ?? placeholderText}
                    className={[
                        'bg-transparent outline-none font-mono text-cradle-text-primary placeholder:text-cradle-text-muted',
                        'pl-9',
                        'w-full',
                        className ?? '',
                    ].join(' ')}
                />
            </div>
        ),
    );

    CustomInput.displayName = 'CustomDateInput';

    return (
        <div className='relative w-full'>
            <ReactDatePicker
                onChange={onChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                showTimeSelect
                shouldCloseOnSelect={false}
                open={open}
                onClickOutside={() => onClickOutside?.()}
                dateFormat='yyyy-MM-dd HH:mm'
                portalId='portal-root'
                customInput={<CustomInput className={className} />}
                isClearable={false}
                placeholderText={placeholderText}
                wrapperClassName='w-full'
                popperClassName='z-[9999]'
            />
        </div>
    );
};

export default Datepicker;
