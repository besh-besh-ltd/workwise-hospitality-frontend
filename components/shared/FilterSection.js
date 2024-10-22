import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getProjectList } from '@/services/project';


const FilterSection = ({ title, setFilterData }) => {
    const [projects, setProjects] = useState(null);

    const handleFilterChange = (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        const { value } = selectedOption || { value: name === "reverse_auction" ? "-1" : name === "project_id" ? -1 : ""}; 

        setFilterData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    }

    const getAllProjects = () => {
        getProjectList()
            .then((res) => {
                let d = [];
                res.data.map((item) => {
                    d.push({ label: item.name, value: item.id });
                });
                setProjects(d);
            })
            .catch((error) => {
                console.log(error)
            })
    }

    useEffect(() => {
        getAllProjects();
    }, []);

    return (
        <div className="filter-section">
            {title && <h2 className="title">{title}</h2>}

            <div className="row mb-4 text-sm" >

                <div className="col-md-3 col-lg-2">
                    <label>RFQ Type</label>
                    <Select
                        options={[
                            { label: "Budgetary", value: "budgetary" },
                            { label: "Firm", value: "firm" }
                        ]}
                        onChange={handleFilterChange}
                        name="rfq_type"
                        placeholder="Select"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-2">
                    <label>Reverse Auction</label>
                    <Select
                        options={[
                            { label: "Enabled", value: "1" },
                            { label: "Disabled", value: "0" }
                        ]}
                        onChange={handleFilterChange}
                        name="reverse_auction"
                        placeholder="Select"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-3">
                    <label>Select Project</label>
                    <Select
                        options={projects}
                        onChange={handleFilterChange}
                        name="project_id"
                        placeholder="Select"
                        isClearable
                    />
                </div>

                <div className="col-lg-3"></div>

                <div className="col-md-3 col-lg-2">
                    <label>Sort By</label>
                    <Select
                        options={[
                            { label: "Latest to Oldest", value: "DESC" },
                            { label: "Oldest to Latest", value: "ASC" }
                        ]}
                        onChange={handleFilterChange}
                        name="sort"
                        placeholder="Select"
                        defaultValue={{ label: "Latest to Oldest", value: "DESC" }}
                    />
                </div>

            </div>
        </div>
    )
}

export default FilterSection
