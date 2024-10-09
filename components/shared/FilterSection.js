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
            <h2 className="title">{title}</h2>

            <div className="row mb-4 text-sm" >

                <div className="col-md-3 col-lg-2">
                    <Select
                        options={[
                            { label: "Budgetary", value: "budgetary" },
                            { label: "Firm", value: "firm" }
                        ]}
                        onChange={handleFilterChange}
                        name="rfq_type"
                        placeholder="RFQ Type"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-2">
                    <Select
                        options={[
                            { label: "Enabled", value: "1" },
                            { label: "Disabled", value: "0" }
                        ]}
                        onChange={handleFilterChange}
                        name="reverse_auction"
                        placeholder="Reverse Auction"
                        isClearable
                    />
                </div>

                <div className="col-lg-3"></div>

                <div className="col-md-3 col-lg-3">
                    <Select
                        options={projects}
                        onChange={handleFilterChange}
                        name="project_id"
                        placeholder="Select Project"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-2">
                    <Select
                        options={[
                            { label: "Latest RFQs", value: "DESC" },
                            { label: "Oldest RFQs", value: "ASC" }
                        ]}
                        onChange={handleFilterChange}
                        name="sort"
                        placeholder="Sort By"
                        defaultValue={{ label: "Latest RFQs", value: "DESC" }}
                    />
                </div>

            </div>
        </div>
    )
}

export default FilterSection
