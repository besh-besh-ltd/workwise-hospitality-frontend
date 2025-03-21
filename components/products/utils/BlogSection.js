import React, { useEffect, useState } from 'react';
import DynamicBlog from '@/components/products/utils/DynamicBlog';


export const BlogSection = () => {
  
const [blogData , setblogData] = useState([]);


useEffect(()=>{
  

})

return (
  <div className="mt-5 pt-5">
    <h2 className="text-center font-semibold mb-4">Latest Blogs</h2>
    <div className="row g-4">
      {blogData.map((blog) => (
        <div key={blog.id} className="col-md-6 col-lg-4">
          <DynamicBlog
            image={blog.image}
            title={blog.title}
            description={blog.description}
          />
        </div>
      ))}
    </div>
  </div>
)
};