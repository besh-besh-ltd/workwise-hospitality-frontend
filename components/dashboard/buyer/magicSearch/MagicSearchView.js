import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Table, Form } from "react-bootstrap";
import { toast } from "react-toastify";

const MagicSearchView = () => {
  const [jsonData, setJsonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");
  const { query, isReady } = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const jsonUrl = query.jsonUrl;
    if (!jsonUrl) {
      setError("No JSON URL provided.");
      setLoading(false);
      return;
    }

  const fetchData = async () => {
    const replacedUrl = decodeURIComponent(jsonUrl).replace("http://", "https://");
    const originalUrl = decodeURIComponent(jsonUrl);

    const tryFetch = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed with status: ${response.status}`);
        const data = await response.json();
        setJsonData(data);
        const sheets = Object.keys(groupBySheet(data));
        if (sheets.length) setActiveSheet(sheets[0]);
        console.log("Data fetched successfully from:", url);
        return true;
      } catch (err) {
        console.error("Fetch failed from:", url, err);
        return false;
      }
    };

    setLoading(true);
    const success = await tryFetch(replacedUrl);

    if (!success) {
      await tryFetch(originalUrl);
    }

    setLoading(false);
  };

  fetchData();
}, [isReady, query]);

  const groupBySheet = (data) =>
    data.reduce((acc, item) => {
      const sheet = item.sheet_name || "Default";
      acc[sheet] = acc[sheet] || [];
      acc[sheet].push(item);
      return acc;
    }, {});

  const groupedData = groupBySheet(jsonData);
  const sheetOptions = Object.keys(groupedData);

  return (
    <>
      <section className="buyer-common-header sc-pt-40">
        <div className="container-fluid"></div>
      </section>

      <section className="buyer-rfq-sec-1 buyer-rfq-sec-tab">
        <div className="container-fluid">
          <div>
            <h2 className="heading text-white ">Simplified Boq</h2>
          </div>
          <div className="col-md-12">
            <div className="p-4">
              {/* <h2>Magic Search Results</h2> */}
              {loading && <p>Loading...</p>}
              {error && <p className="text-danger">{error}</p>}
              {!loading && !error && (
                <>
                  <Form.Select
                    value={activeSheet}
                    onChange={(e) => setActiveSheet(e.target.value)}
                    className="mb-3"
                  >
                    {sheetOptions.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet} ({groupedData[sheet].length})
                      </option>
                    ))}
                  </Form.Select>

                  <div className="table-responsive">
                    <Table striped bordered hover>
                      <thead className="table-dark">
                        <tr>
                          <th style={{ maxWidth: "250px" }}>Product Name</th>
                          <th style={{ maxWidth: "200px" }}>Size</th>
                          <th style={{ maxWidth: "300px" }}>Specification</th>
                          <th style={{ maxWidth: "100px" }}>Quantity</th>
                          <th style={{ maxWidth: "300px" }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedData[activeSheet]?.map((product, idx) => (
                          <tr key={idx}>
                            <td
                              style={{
                                maxWidth: "300px",
                                wordWrap: "break-word",
                              }}
                            >
                              {product.core_product_name || "-"}
                            </td>
                            <td
                              style={{
                                maxWidth: "200px",
                                wordWrap: "break-word",
                              }}
                            >
                              {product.size || "-"}
                            </td>
                            <td
                              style={{
                                maxWidth: "300px",
                                wordWrap: "break-word",
                              }}
                            >
                              {product.feature_or_specifications || "-"}
                            </td>
                            <td style={{ maxWidth: "100px" }}>
                              {parseInt(product?.quantity || 0) +
                                " - " +
                                product.unit}
                            </td>
                            <td
                              style={{
                                maxWidth: "400px",
                                wordWrap: "break-word",
                              }}
                            >
                              {product.summary_of_product_description || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default MagicSearchView;
