import React from "react";
import PropTypes from "prop-types";
import axiosInstance from "../../utils/API";
import {Alert, Col, Table} from "reactstrap";
import "../../utils/Global";
import FileOperations from "../Base/NewFolder/FileOperations";
import {DropTarget} from "react-dnd";
import FileComponent from "./FileComponent";
import {ItemTypes} from "./Constants";


const propTypes = {
    updateRemotePathHandle: PropTypes.func.isRequired,
    upButtonHandle: PropTypes.func.isRequired,
    remotePath: PropTypes.string.isRequired
};

const defaultProps = {
    remotePath: "",
};

function addSemicolonAtLast(name) {
    if (name[-1] !== ":") {
        name = name + ":"
    }
    return name;
}

function UpRowComponent({upButtonHandle}) {
    return (<tr onClick={() => {
        upButtonHandle()
    }} className={"pointer-cursor"}>
        <td></td>
        <td><i className={"fa fa-file-o"}/> Go Up...</td>
        <td></td>
        <td></td>
        <td></td>
    </tr>);
}


/*
* Start code for react DND
* */

const filesTarget = {
    drop(props, monitor) {
        if (monitor.didDrop()) return;
        console.log("drop", props, monitor, monitor.getItem());

        let {Name, Path, IsDir, remoteName} = monitor.getItem();

        let srcRemoteName = addSemicolonAtLast(remoteName);
        let srcRemotePath = Path;
        let destRemoteName = addSemicolonAtLast(props.remoteName);
        let destRemotePath = props.remotePath;

        // if(dropEffect === "move"){ /*Without pressing alt*/

        // performCopyFile(srcRemoteName, srcRemotePath, destRemoteName, destRemotePath, Name, IsDir);
        // }else{
        //
        // }

        return {srcRemoteName, srcRemotePath, destRemoteName, destRemotePath, Name, IsDir}

    }
};

function collect(connect, monitor) {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.isOver()
    }
}

function renderOverlay() {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
                zIndex: 1,
                opacity: 0.5,
                backgroundColor: 'gray',
            }}
        />
    );
}

/*
* END code for react DND
* */


class FilesView extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            filesList: [],
            isLoading: false,
            isDownloadProgress: false,
            downloadingItems: 0,
            isOperationInProgress: false

        };
        this.handleFileClick = this.handleFileClick.bind(this);
        this.downloadHandle = this.downloadHandle.bind(this);
        this.deleteHandle = this.deleteHandle.bind(this);
    }

    componentDidMount() {
        // const {remoteName, remotePath} = this.props;
        this.getFilesList();
        // if(this.updateInterval === null)
        //     this.updateInterval = setInterval(()=>this.getFilesList(false), 3000);
    }

    componentWillUnmount() {
        // clearInterval(this.updateInterval);
        // this.updateInterval = null;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const {remoteName, remotePath} = this.props;
        if (prevProps.remoteName !== remoteName || prevProps.remotePath !== remotePath) {
            this.getFilesList();
        }
    }

    handleFileClick(e, item) {
        const {Path, IsDir} = item;
        const {updateRemotePathHandle} = this.props;
        console.log("Clicked" + Path);
        if (IsDir) {
            updateRemotePathHandle(Path);
        } else {
            this.downloadHandle(item);
        }

    }


    async getFilesList() {
        let {remoteName, remotePath} = this.props;

        if (remoteName !== "") {

            console.log(remoteName, remotePath);

            remoteName = addSemicolonAtLast(remoteName);


            let data = {
                fs: remoteName,
                remote: remotePath
            };

            this.setState({isLoading: true});
            let res = await axiosInstance.post("/operations/list", data);


            // console.log(res);
            this.setState({filesList: res.data.list, isLoading: false});
        }
    }

    async downloadHandle(item) {
        let {remoteName, remotePath} = this.props;

        const downloadUrl = `/[${remoteName}:${remotePath}]/${item.Name}`;
        // openInNewTab(downloadUrl);

        this.setState((prevState) => {
            return {
                downloadingItems: prevState.downloadingItems + 1,
                isDownloadProgress: true
            };
        });

        let response = await axiosInstance({
            url: downloadUrl,
            method: 'GET',
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', item.Name);
        document.body.appendChild(link);
        link.click();

        this.setState((prevState) => {
            return {
                downloadingItems: prevState.downloadingItems - 1,
            };
        }, () => {
            if (this.state.downloadingItems === 0) {
                this.setState({isDownloadProgress: false})
            }
        });
    }

    async deleteHandle(item) {
        console.log("Delete pressed");
        let {remoteName} = this.props;

        const data = {
            fs: addSemicolonAtLast(remoteName),
            remote: item.Path,
        };
        try {
            if (item.IsDir) {

                let res = await axiosInstance.post("/operations/purge", data);
                console.log("deletefile", res);


            } else {

                let res = await axiosInstance.post("/operations/deletefile", data);
                console.log("deletefile", res);
            }
        } catch (e) {
            console.log(`Error in deleting file`);
        }

    }

    dismissAlert = (e) => {
        this.setState({isDownloadProgress: false});
    };


    render() {
        const {isLoading, isDownloadProgress, downloadingItems, isOperationInProgress} = this.state;
        const {connectDropTarget, isOver, upButtonHandle, remoteName} = this.props;
        if (isLoading) {
            return (<div><i className={"fa fa-circle-o-notch fa-lg"}/> Loading</div>);
        } else {

            const {filesList} = this.state;
            if (remoteName === "") {
                return (<div>No remote is selected. Select a remote from above to show files.</div>);
            }

            console.log("filesList", filesList);

            let dirComponentMap = filesList.map((item, idx) => {
                let {ID, Name} = item;
                // Using fallback as fileName when the ID is not available (for local file system)
                if (ID === undefined) {
                    ID = Name;
                }
                if (item.IsDir) {
                    return (
                        <React.Fragment key={ID}>
                            <FileComponent item={item} clickHandler={this.handleFileClick}
                                           downloadHandle={this.downloadHandle} deleteHandle={this.deleteHandle}
                                           remoteName={remoteName}/>
                        </React.Fragment>
                    )
                }
            });

            let fileComponentMap = filesList.map((item, idx) => {
                let {ID, Name} = item;
                // Using fallback as fileName when the ID is not available (for local file system)
                if (ID === undefined) {
                    ID = Name;
                }
                if (!item.IsDir) {
                    return (
                        <React.Fragment key={ID}>
                            <FileComponent item={item} clickHandler={this.handleFileClick}
                                           downloadHandle={this.downloadHandle} deleteHandle={this.deleteHandle}
                                           remoteName={remoteName}/>
                        </React.Fragment>
                    )
                }
            });

            const renderElement = (
                <React.Fragment>
                    <tr>
                        <td></td>
                        <td><strong> Directories</strong></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    {dirComponentMap}
                    <tr>
                        <td></td>
                        <td><strong> Files</strong></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    {fileComponentMap}
                </React.Fragment>
            )


            return connectDropTarget(
                <div className={"col-12"}>
                    {isOver && renderOverlay()}

                    <Alert color="info" isOpen={isDownloadProgress} toggle={this.dismissAlert} sm={12}
                           lg={12}>
                        Downloading {downloadingItems} file(s). Please wait.
                    </Alert>
                    <Alert color="info" isOpen={isOperationInProgress} toggle={this.dismissAlert} sm={12}
                           lg={12}>
                        Copy in progress
                    </Alert>

                    <Col sm={12}>
                        <FileOperations/>
                    </Col>


                    <Table sm={12} lg={12}>
                        <thead>
                        <tr>
                            <th></th>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Modified</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        <UpRowComponent key={"uniqueKey"} upButtonHandle={upButtonHandle}/>
                        {filesList.length > 0 ? renderElement :
                            (<tr>
                                <td></td>
                                <td>No files</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>)
                        }
                        </tbody>
                    </Table>
                </div>
            );
        }
    }

}

FilesView.propTypes = propTypes;
FilesView.defaultProps = defaultProps;

export default DropTarget(ItemTypes.FILECOMPONENT, filesTarget, collect)(FilesView);
