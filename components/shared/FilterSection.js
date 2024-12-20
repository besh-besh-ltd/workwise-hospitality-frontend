import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getProjectList } from '@/services/project';


const FilterSection = ({ title, setFilterData }) => {
    const [projects, setProjects] = useState(null);
    const [rfqNo, setRfqNo] =useState(null);

    useEffect(() => {
        const handler = setTimeout(() => {
                setFilterData((prevState) => ({
                    ...prevState,
                    ["rfq_no"]: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
                }));
        }, 1000);
    
        return () => {
          clearTimeout(handler);
        };
      }, [rfqNo]);

      

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

                <div className="col-md-2 col-lg-2">
                    <label>Search RFQ No.</label>
                    <input
                        className="form-control react-select" 
                        style={{ borderRadius: '0.25rem', borderColor: '#ced4da', boxShadow: 'none' }}
                        value={rfqNo}
                        onChange={(e)=> setRfqNo(e.target.value)}
                        name="rfq_type"
                        placeholder="Ex. 123456"
                        isClearable
                    />
                </div>

                <div className="col-lg-2"></div>


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

                <div className="col-md-3 col-lg-2">
                    <label>Select Project</label>
                    <Select
                        options={projects}
                        onChange={handleFilterChange}
                        name="project_id"
                        placeholder="Select"
                        isClearable
                    />
                </div>

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
