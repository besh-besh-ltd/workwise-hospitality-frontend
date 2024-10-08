import AddVendorModal from '@/components/modal/AddVendorModal';
import Pagination from '@/components/shared/Pagination';
import ReadMore from '@/components/shared/ReadMore';
import { createProject, getAllProjects } from '@/services/project';
import { faFolderPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import React, { useEffect, useState } from 'react'
import PlaceholderLoading from 'react-placeholder-loading';
import { toast } from 'react-toastify';

const ProjectManagement = () => {
    const [openCreateProject, setOpenCreateProject] = useState(false);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(100);

    const [allProjects, setAllProjects] = useState(null);

    const getProjects = () => {
        setLoading(true)
        getAllProjects()
            .then((res) => {
                setAllProjects(res.data)
                setTotalData(res.data.length)
            })
            .catch((error) => {
                console.log(error)
            })
            .finally(() => {
                setLoading(false)
            });
    }

    const handleCreateProject = (values, resetForm) => {
        setLoading(true);
        let payload = {
            name: values.projectName,
            description: values.projectDescription,
            location: values.location,
            ended_at: values.ended_at
        };

        createProject(payload)
            .then((res) => {
                console.log(res)
                toast.success(res.message, { position: "top-right", });
                getProjects();
            })
            .catch((error) => {
                toast.error(error.message?.response?.data?.message, { position: "top-right", });
                console.log(error)
            })
            .finally(() => {
                resetForm();
                setOpenCreateProject(false);
                setLoading(false);
            })
    }

    useEffect(() => {
        getProjects()
    }, [])

    return (
        <>
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Project Management</h1>
                </div>
            </section>

            <section className="vendor-mngt-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="vendor-mngt-con">

                                <div className="d-flex justify-content-between">
                                    <span className="title mb-0">Your Projects</span>
                                    <button
                                        type="button"
                                        className="page-link backBtn btn btn-secondary text-white my-0  "
                                        style={{ maxWidth: "280px" }}
                                        onClick={() => setOpenCreateProject(true)}
                                    >
                                        <FontAwesomeIcon icon={faFolderPlus} className="me-2" />
                                        Create New Project
                                    </button>
                                </div>
                                <div className="details-table p-4 ">
                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th scope='col'>Sl No.</th>
                                                    <th scope="col">Project Name</th>
                                                    <th scope="col">Description</th>
                                                    <th scope="col">Total RFQs</th>
                                                    <th scope="col">Open RFQs</th>
                                                    <th scope="col">Closed RFQs</th>
                                                    <th scope="col">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading &&
                                                    <tr>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                    </tr>
                                                }
                                                {!loading && allProjects && allProjects?.length > 0
                                                    && allProjects?.map((projectItem, index) => {
                                                        return (
                                                            <tr key={`project_${projectItem.id}`} >
                                                                <td>{index + 1}</td>
                                                                <td>{projectItem.name}</td>
                                                                <td style={{ maxWidth: "450px" }}>
                                                                    <ReadMore content={projectItem.description} maxLength={300} />
                                                                </td>
                                                                <td>{projectItem.total_rfqs}</td>
                                                                <td>{projectItem.open_rfqs}</td>
                                                                <td>{projectItem.closed_rfqs}</td>
                                                                <td>
                                                                    <Link
                                                                        href={`./project-management/${projectItem.id}`}
                                                                        className="page-link"
                                                                    >
                                                                        View
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                }
                                            </tbody>
                                        </table>
                                    </div>

                                    <Pagination
                                        page={page}
                                        setPage={setPage}
                                        limit={limit}
                                        setLimit={setLimit}
                                        totalData={totalData}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {openCreateProject &&
                <AddVendorModal
                    type={'create-project'}
                    openModal={openCreateProject}
                    closeModal={() => setOpenCreateProject(false)}
                    handleCreateProject={handleCreateProject}
                />
            }
        </>
    )
}

export default ProjectManagement
