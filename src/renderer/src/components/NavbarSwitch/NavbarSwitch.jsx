export default function NavbarSwitch(props){
    return (
        <button className="navbar-item hover:bg-gray-4">
            <div className="flex flex-row items-center w-fit h-fit">
                <label htmlFor={props.key} className="mr-1 text-cradle2">{props.label}</label>
                <input type="checkbox" id={props.key} className="switch focus:ring-0" checked={props.checked} onChange={props.onChange}/>
            </div>
        </button>
    );
}