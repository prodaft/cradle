export default function NavbarDropdown(props){
    return (
        <div className="dropdown">
            <button className="navbar-item hover:bg-gray-4" tabIndex="0">{props.icon}</button>
            <div className="dropdown-menu border border-gray-10">
                {props.contents.map((content, index) => (
                    <a key={index} className="dropdown-item text-sm" onClick={content.handler}>{content.label}</a>
                ))}
            </div>
        </div>
    );
}